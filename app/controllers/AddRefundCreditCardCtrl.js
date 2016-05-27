/* global App */

App
.controller('AddRefundCreditCardCtrl', function($rootScope, $scope, $state, $stateParams, $ionicPopup, gettextCatalog, LocalStorageService, SyncService, UsersModel, GroupsModel) {

    //$scope.current_user = {'email':LocalStorageService.get("user_email"), 'id':LocalStorageService.get("user_id"), 'username':LocalStorageService.get("user_name")};

    var BeneficiaryGuid = $stateParams.BeneficiaryGuid;
    var step = $stateParams.step;

    $scope.message = {
        no_account : gettextCatalog.getString("It's your first payment on Debal, we'll need some info (last name, birthday...) that you'll need to fill in at next step!"),
        no_card : gettextCatalog.getString("You have no credit card registered. You will register you credit card at next step!")
    }

    function initRefund() {
        if(typeof $scope.current_user != 'undefined') {
            $scope.current_user.hasPayerAccount = false;
            $scope.current_user.hasRegisteredCard = false;
            $scope.current_user.hasRegisteredBankAccount = false;
            $scope.refund = {};

            // Check if payer account and wallet enabled
            UsersModel.get_user_details($scope.current_user.id, function(res) {
                if(typeof res != 'undefined' && res.length==1) {
                    $scope.current_user.account = angular.copy(res[0]);
                    if(res[0].mangopay_user_id!=null && res[0].mangopay_wallet_id!=null)
                        $scope.current_user.hasPayerAccount = true;
                    if(res[0].mangopay_card_id!=null)
                        $scope.current_user.hasRegisteredCard = true;
                    if(res[0].mangopay_bank_id!=null)
                        $scope.current_user.hasRegisteredBankAccount = true;
                }
                else
                    $scope.current_user.account = {'user_id':parseInt($scope.current_user.id)};
            });


            // Load beneficiary data
            GroupsModel.get_group_and_user_from_guid(BeneficiaryGuid, function(res) {
                $scope.beneficiary = {username:res[0].username, email:res[0].email, group:res[0].name, registered:res[0].email != null}

                // Check if groups match and beneficiary is not current user
                if($scope.GroupId != res[0].GroupId || res[0].email == $scope.current_user.email) {
                    $state.go('app.group.tabs.expenses', GroupId)
                }
            });

            // Get balance between members
            $scope.$watch('balances', function(newValue, oldValue) {
                getP2PBalance();
            });
            getP2PBalance();
        }
    }

    function getP2PBalance() {
        if(typeof $scope.balances != 'undefined') {
            $scope.getP2PBalance($scope.currentUserGuid, BeneficiaryGuid, function(amount) {
                $scope.refund.amount = amount;
                $scope.debt = angular.copy($scope.refund.amount);
            });
        }
    }

    $scope.$watch('current_user', function(n,v) {
        initRefund();
    });

    initRefund();

    $scope.AddRefundStep2 = function() {

        // Check fields
        if($scope.refund.amount==0 || $scope.refund.amount=='null' || $scope.refund.amount==null) {
            return $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("The amount may not be null!")
            });
        }
        else if(!is_amount($scope.refund.amount)) {
            return $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("The amount may only contain digits and a dot (no commas!)")
            });
        }
        // Check email address in case of beneficiary not registered
        else if(!$scope.beneficiary.registered && ($scope.beneficiary.email==null || $scope.beneficiary.email=='')) {
            return $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please fill in beneficiary's email address!")
            });
        }

        if(!$scope.hasPayerAccount) {
            var popup =  $ionicPopup.alert({
                title: gettextCatalog.getString('Payer account'),
                template: $scope.message.no_account
            });
            popup.then(function() {
                $rootScope.redirect_after_account_creation = {route: 'app.payments-creditcard', var:{}}
                $rootScope.redirect_after_card_creation = {route: 'app.group.addrefund', var: {GroupId:GroupId, BeneficiaryGuid: BeneficiaryGuid, step:1}}
                return $state.go('app.payments-account');
            });   
        }

        // If No registered card, go to card registration form first
        else if(!$scope.hasRegisteredCard) {
            var popup =  $ionicPopup.alert({
                title: gettextCatalog.getString('Register credit card'),
                template: $scope.message.no_card
            });
            popup.then(function() {
                return $state.go('app.payments-creditcard');
            });  
        } 

        else {

            $rootScope.redirect_after_account_creation = false;
            $rootScope.redirect_after_card_creation = false;
            // Check Internet

            // Ask Confirmation
            var confirmPopup = $ionicPopup.confirm({
                title: gettextCatalog.getString('Information'),
                template: template_text,
                buttons: [
                    { text: gettextCatalog.getString('Cancel') },
                    {
                        text: gettextCatalog.getString('OK'),
                        type: 'button-calm',
                        onTap: function(e) {
                            return true
                        }
                    },
                ]
            });
            // Process payment
            
            /*** /!\/!\/!\ AMOUNT IN CENTS /!\/!\/!\ ***/
            var send_data = {amount:$scope.refund.amount, currency:'EUR', beneficiary:46937};
            SyncService.api_send("mangopay_process_group_payment", send_data, function(data, status) {
                console.error(data);
                if(status==200) {
                    if(data.result == "OK" && data.data == "payment_processed") {
                        // Popup confirmation
                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Payment done!'),
                            template: gettextCatalog.getString('The payment has been successfully processed. Beneficiary has been notified.')
                        });

                        // Redirect to group's listing
                    }
                    else if(data.result == "ERROR") {
                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Oops !'),
                            template: data.data
                        });
                    }
                    
                }
            });
        }
    }

    $scope.tel_keyboard = false;

    var device = ionic.Platform.device();
    var devices_models_kb = ["SM-T530","SM-T111","SM-T110","SM-T311","SM-T310","SM-T315","KTU84L","SM-G900F","SM-G800F","GT-I9300","GT-P5210","C5303","GT-I9195","GT-I9500","GT-I9505","GT-I9506"];
    $scope.tel_keyboard = (LocalStorageService.get("setting_tel_keyboard")==="true" || (!LocalStorageService.get("setting_tel_keyboard") && typeof(device.model)!=='undefined' && devices_models_kb.indexOf(device.model)>-1));

    $scope.trackView();

});