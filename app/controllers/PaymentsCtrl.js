App
.controller('PaymentsCtrl', function($scope, $locale, $rootScope, $state,SyncService, UsersModel, LocalStorageService, gettextCatalog, ionicDatePicker, $filter) {

    $scope.current_user = {'email':LocalStorageService.get("user_email"), 'id':LocalStorageService.get("user_id"), 'username':LocalStorageService.get("user_name")};    


    /*** payments (home) ****/
    $scope.goTuto = function() {
        $state.go('app.payments-tuto');
    };

    $scope.goAccount = function() {
        $state.go('app.payments-account');
    };

    $scope.editCreditCard = function() {
        $state.go('app.payments-creditcard');
    };

    $scope.goIban = function() {
        $state.go('app.payments-iban');
    };
    

    /******* payments-account *****/
    var dtf = $locale.DATETIME_FORMATS, ipObj1;

    UsersModel.get_user_details($scope.current_user.id, function(res) {
        $scope.current_user.hasPayerAccount = false;
        $scope.current_user.hasRegisteredCard = false;
        $scope.current_user.hasRegisteredBankAccount = false;
        if(typeof res != 'undefined' && res.length==1) {

            if(res[0].mangopay_user_id!=null && res[0].mangopay_wallet_id!=null)
                $scope.current_user.hasPayerAccount = true;
            if(res[0].mangopay_card_id!=null)
                $scope.current_user.hasRegisteredCard = true;
            if(res[0].mangopay_bank_id!=null)
                $scope.current_user.hasRegisteredBankAccount = true;

            $scope.account = angular.copy(res[0]);
            $scope.account.bank = {
                ownerName : $scope.account.first_name + ' ' + $scope.account.last_name,
                ownerCountry : $scope.account.country_of_residence
            }
            var bd = angular.copy($scope.account.birthday);
           // $scope.account.birthday = (is_set(bd) && !bd.match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/)) ? $filter('date')(new Date(), dtf.longDate) : $filter('date')(new Date($scope.account.birthday), dtf.longDate)

            
        }
        else
            $scope.account = {'user_id':parseInt($scope.current_user.id)};

        ipObj1 = {

            callback: function (val) {
                ipObj1.inputDate = new Date(val);
                $scope.account.birthday = $filter('date')(new Date(val), dtf.longDate);
            },
            inputDate: new Date(),
            closeLabel: gettextCatalog.getString('Close'),
            mondayFirst: true,
            weeksList: dtf.SHORTDAY.map(function(day) { return day.substr(0,1).toUpperCase(); }),
            monthsList: dtf.SHORTMONTH,
            templateType: 'popup',
            from: new Date(1950, 1, 1),
            to: new Date(2005, 1, 1),
            showTodayButton: false,
            dateFormat: dtf.longDate,
            closeOnSelect: true,
        };
    });
   
    $scope.openDatePicker = function(){
      ionicDatePicker.openDatePicker(ipObj1);
    };

    $scope.saveAccountData = function() {
        var account = angular.copy($scope.account);
        console.error(account);
        if(typeof account.birthday != 'undefined' && account.birthday.length>0)
            account.birthday = $filter('date')(ipObj1.inputDate, 'yyyy-MM-dd');
        UsersModel.update_user_details(account, function(res) {
            console.error(res);

            if(typeof $rootScope.redirect_after_account_creation == 'object') {
                $state.go($rootScope.redirect_after_account_creation.route, $rootScope.redirect_after_account_creation.var);
            }

        })
    }


    /*********** payments-card *******************/
    $scope.creditcard = {
        number:'4970100000000154',
        expiry:'12/18',
        cvc:'123'
    };
    $scope.mangopay = {result:''};
    $scope.saveCardData = function() {
        // TODO : CHECK INTERNET

        var creditcard = angular.copy($scope.creditcard);
        console.error($scope.creditcard);
        // Get CardRegistrationUrl From Debal Server
        SyncService.api_send("mangopay_register_card", null, function(data, status) {
            console.error(data);
            /*
            "data": {
        "UserId": "12745309",
        "CardType": "CB_VISA_MASTERCARD",
        "AccessKey": "1X0m87dmM2LiwFgxPLBJ",
        "PreregistrationData": "ObMObfSdwRfyE4QClGtUc550a9iKHnB_oqlTun3B0Hh2pdquUy62bbntAa_GVb3nS4wCy-yiraxeE65tmxOe8A",
        "CardRegistrationURL": "https:\/\/homologation-webpayment.payline.com\/webpayment\/getToken",
        "CardId": null,
        "RegistrationData": null,
        "ResultCode": null,
        "ResultMessage": null,
        "Currency": "EUR",
        "Status": "CREATED",
        "Id": "12755960",
        "Tag": null,
        "CreationDate": 1463675942
    }*/
            if(status==200 && typeof data.result !== 'undefined') {
                if(data.result=="OK") {

                    $scope.mangopay.result = "Processing...";

                    // Card register data prepared on the server
                    var cardRegisterData = {
                        cardRegistrationURL: data.data.CardRegistrationURL, 
                        preregistrationData: data.data.PreregistrationData, 
                        accessKey: data.data.AccessKey,
                        Id: data.data.Id
                    };

                    // Card data collected from the user
                    var cardData = {
                        cardNumber: $scope.creditcard.number,
                        cardCvx: $scope.creditcard.cvc,
                        cardType: "CB_VISA_MASTERCARD"
                    };

                    console.error(cardRegisterData);

                    console.error(cardData);


                    expiryArray = ($scope.creditcard.expiry).split("/");

                    cardData.cardExpirationDate = expiryArray[0] + expiryArray[1].substr(-2);

                    // Set MangoPay API base URL and Client ID
                    mangoPay.cardRegistration.baseURL = "https://api.sandbox.mangopay.com";
                    mangoPay.cardRegistration.clientId = "debalapp";

                    // Initialize the CardRegistration Kit
                    mangoPay.cardRegistration.init(cardRegisterData);

                    // Register card
                    mangoPay.cardRegistration.registerCard(cardData, 
                        function(res) {
                            UsersModel.update_user_details({user_id:$scope.current_user.id, mangopay_card_id:res.CardId}, function(res) {
                                console.error(res);
                            })
                            var message = 'Card has been succesfully registered under the Card Id ' + res.CardId + '.<br />';
                            message += 'Card is now ready to use e.g. in a «Direct PayIn» Object.';
                            $scope.mangopay.result = message;
                            if(typeof $rootScope.redirect_after_card_creation == 'object') {
                                $state.go($rootScope.redirect_after_card_creation.route, $rootScope.redirect_after_account_creation.var);
                            }
                        },
                        function(res) {
                            var message = 'Error occured while registering the card.<br />';
                            message += 'Code: ' + res.ResultCode + ', message: ' + res.ResultMessage;
                            $scope.mangopay.result = message;
                        }
                    );
                }
                else {

                   console.error("error1");

                }
                
            }
            else {
               console.error("error2");
            }
        });
    }




    /******** payments-iban ****/
    $scope.saveIbanData = function() {
        var bankData = angular.copy($scope.account.bank);

        // Todo Check Internet

        SyncService.api_send("mangopay_register_bankaccount", bankData, function(data, status) {
            console.error(data);
            if(status==200 && typeof data.result !== 'undefined') {
                if(data.result=="OK" && data.data=="bankaccount_registered") {
                }
            }
        });
    }

    $scope.trackView();
});