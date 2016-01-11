/* global cordova,App, facebookConnectPlugin */

App
.controller('LoginCtrl', function($scope, $rootScope, $ionicPopup, $state, $ionicSideMenuDelegate, $ionicLoading, gettextCatalog, GENERAL_CONFIG, LoginService, LocalStorageService, SyncService, initService) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.goLanding = function() {
        $state.go('landing');
    };

    $scope.goRegister = function() {
        $state.go('register');
    };

    $scope.forgotPassword = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Forgot your password?'),
            template: gettextCatalog.getString('You will be redirected to the password recovery page.'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: 'OK', type: 'button-calm', onTap: function(e) { return true; } }
            ]
        });

        confirmPopup.then(function(res) {
            if(res) {
                window.open('https://debal.fr/users/forgot_password?email=' + $scope.user.email + '&locale=' + LocalStorageService.get("locale") + 'utm_source=app&utm_medium=forgot_password&utm_campaign=outbound', '_system');
            }
        });
    };
    

    $scope.facebookLogin = function() {
        $ionicLoading.show();
        facebookConnectPlugin.login(["email", "public_profile"],facebook_success,facebook_error);
    };

    function facebook_success(response) {
        $ionicLoading.hide();

        if(typeof(response.authResponse)!=='undefined' && typeof(response.authResponse.accessToken)!=='undefined') {
            var accessToken =  response.authResponse.accessToken;
            $ionicLoading.show({duration:10000});
            facebookConnectPlugin.api( "me/?fields=email", [], function(response) {
                var email = response.email;
                var sendData = {data:{'accessToken':accessToken}};
                LoginService.facebook_connect(sendData, function(response, status) {
                    $ionicLoading.hide();
                    if(status===200 && response.result==="OK") {
                        $scope.signIn({email:email, password:accessToken});
                    }
                    else {
                        facebook_error();
                    }
                });


            }, facebook_error);
        }
        else
            facebook_error();
         
    }

    function facebook_error(response) {
        $ionicLoading.hide();
        $ionicPopup.alert({
            title: gettextCatalog.getString('Error'),
            template: gettextCatalog.getString("Unable to connect with you Facebook account at the moment.")
        });
    }

    $scope.signIn = function(user) {

        $ionicLoading.show({duration:25000});
        
        // if is set userdata email and password
        if(typeof(user.email!=='undefined') && typeof(user.password!=='undefined')) {

            var userData = {
                email : user.email,
                password : user.password
            };

            LoginService.login(userData, function(response, status) {
                $ionicLoading.hide();

                if(status===401) {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString('Incorrect email or password')
                    });
                    
                }
                else if(status!==200 || response.result!=="OK") {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Unable to connect to server. Please try again.")
                    });
                }
                else if(response.result==='OK') {
                    // SyncData
                    $ionicLoading.show({templateUrl:false, template:'<ion-spinner></ion-spinner><p>' +  gettextCatalog.getString('Downloading your data from server...') +'</p>', duration:100000});
                    SyncService.syncAndRefresh(function(bool) {
                        $ionicLoading.hide();
                        if(bool===true) {
                            $rootScope.user_email = LocalStorageService.get('user_email');
                            $rootScope.user_name = LocalStorageService.get('user_name');
                            $rootScope.user_id = LocalStorageService.get('user_id');
                            $scope.$apply($state.go('app.groups'));
                        }
                        else {
                            LoginService.changeLoginStatus(false);
                            $ionicPopup.alert({
                                title: gettextCatalog.getString('Error'),
                                template: gettextCatalog.getString("Unable to connect to server. Please try again.")
                            })
                        }
                        
                    });
                }
            });
        }

        else {
            
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please fill in all the fields!")
            });
        }
    };

    $scope.goLogin = function() {
        $state.go('login');
    };

    $scope.user = {};

    $scope.Register = function() {

        var user = $scope.user;
        $ionicLoading.show({duration:25000});
        var registerData = {};
        registerData.data = {
            email: user.email,
            username: user.username,
            password: user.password
            
        };

        LoginService.register(registerData, function(response, status) {

            $ionicLoading.hide();

            if(status!==200) {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString("Unable to connect to server. Please try again.")
                });
            }
            else if(response.result==="ERROR") {
                if(response.data.email) {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("This email address is already used. Did you already register?")
                    });
                }
                else if(response.data.password) {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Password must be at least 6 characters long")
                    });
                }
                else if(response.data.username) {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Invalid username")
                    });
                }
            }
                
            else if (response.result==="OK") {
                $rootScope.user_email = LocalStorageService.get('user_email');
                $rootScope.user_name = LocalStorageService.get('user_name');
                $rootScope.user_id = LocalStorageService.get('user_id');
                
                $ionicLoading.show({duration:60000});
                SyncService.syncAndRefresh(function() {
                    $ionicLoading.hide();
                    $scope.$apply();
                    $state.go('app.groups');
                    $ionicLoading.hide();
                });
            }

            else {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString("Unable to proceed to subscribtion")
                });
            }
            
        });
    };

    $scope.trackView();
});