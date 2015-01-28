App
.controller('LoginCtrl', function($scope, $rootScope, $ionicPopup, $state, $ionicSideMenuDelegate, gettextCatalog, GENERAL_CONFIG, LoaderService, LoginService, LocalStorageService, SyncService, initService) {

    // RECREATE DB IF APP UPDATED
    var app_version = LocalStorageService.get('app_version');

    if(app_version!=GENERAL_CONFIG.APP_VERSION && GENERAL_CONFIG.RECREATE_APP_VERSIONS.indexOf(app_version)>-1) {
        initService.reInit();
    }

    else if(!LocalStorageService.get('login')) {
        initService.reInit();
    }

    else if(LoginService.isLogged()==="true") {
        LoaderService.show();
        initService.init(function() {
            $state.go('app.groups');
            SyncService.syncAndRefresh(function() {
                LoaderService.hide();
            })
        });
    }

    
    $ionicSideMenuDelegate.canDragContent(false);

    $scope.goLanding = function() {
        $state.go('landing');
    }

    $scope.goRegister = function() {
        $state.go('register');
    }

    $scope.forgotPassword = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Forgot password'),
            template: gettextCatalog.getString('You\'ll be directed to the "request a new password" web page'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: 'OK', type: 'button-positive', onTap: function(e) { return true; } },
            ]
        });

        confirmPopup.then(function(res) {
            if(res) {
                window.open('http://debal.fr/users/forgot_password?email=' + $scope.user.email + '&locale=' + LocalStorageService.get("locale") + 'utm_source=app&utm_medium=forgot_password&utm_campaign=outbound', '_system');
            }
        });
    }
    

    $scope.facebookLogin = function() {
        LoaderService.show();
        facebookConnectPlugin.login(["email", "public_profile"],facebook_success,facebook_error);
    }

    function facebook_success(response) {
        LoaderService.hide();

        if(typeof(response.authResponse)!='undefined' && typeof(response.authResponse.accessToken)!='undefined') {
            var accessToken =  response.authResponse.accessToken;
            console.error("---------------------------------------- FB LOGIN SUCCESS");
            LoaderService.show_long();
            facebookConnectPlugin.api( "me/?fields=email", [], function(response) {
                console.error("---------------------------------------- FB API SUCCESS");
                var email = response.email;
                var sendData = {data:{'accessToken':accessToken}};
                LoginService.facebook_connect(sendData, function(response, status) {
                    console.error("---------------------------------------- LOGINSERVICE SUCCESS " + status + " " + JSON.stringify(response));
                    LoaderService.hide();
                    if(status==200 && response.result=="OK") {
                        console.error("---------------------------------------- WILL NOW LOGIN");
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
        LoaderService.hide();
        $ionicPopup.alert({
            title: gettextCatalog.getString('Error'),
            template: gettextCatalog.getString("Unable to connect with your Facebook account right now.")
        });
    }

    $scope.signIn = function(user) {

        LoaderService.show_long();
        
        // if is set userdata email and password
        if(typeof(user.email!=='undefined') && typeof(user.password!=='undefined')) {

            var userData = {
                email : user.email,
                password : user.password
            };

            console.error("---------------------------------------- LOGINSERVICE NOW LOGIN");
            LoginService.login(userData, function(response, status) {

                console.error("---------------------------------------- LOGINSERVICERESPONSE " + status + " " + JSON.stringify(response));
                LoaderService.hide();
                
                if(status===401) {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Incorrect email or password.")
                    });
                    
                }
                else if(status!==200 || response.result!="OK") {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Unable to connect to server. Please try again.")
                    });
                }
                else if(response.result=='OK') {
                    // SyncData
                    $rootScope.user_email = LocalStorageService.get('user_email');
                    $rootScope.user_name = LocalStorageService.get('user_name');
                    $rootScope.user_id = LocalStorageService.get('user_id');

                    LoaderService.show();
                    console.error("---------------------------------------- WILL NOW SYNCANDREFRESH ");
                    SyncService.syncAndRefresh(function() {
                        console.log('LOGIN SyncAndRefresh OK, WILL REDIRECT TO GROUPS');
                        $scope.$apply($state.go('app.groups'));
                        
                    })
                }
            });
        }

        else {
            
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please fill all fields!")
            });
        }
    };

    $scope.goLogin = function() {
        $state.go('login');
    }

    $scope.user = {};


    $scope.Register = function() {

        var user = $scope.user;
        LoaderService.show_long();
        var registerData = {};
        registerData.data = {
            email: user.email,
            username: user.username,
            password: user.password
            
        };

        LoginService.register(registerData, function(response, status) {

            LoaderService.hide();


            if(status!==200) {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString("Unable to connect to server. Please try again.")
                });
            }
            else if(response.result=="ERROR") {
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
                
            else if (response.result=="OK") {
                $rootScope.user_email = LocalStorageService.get('user_email');
                $rootScope.user_name = LocalStorageService.get('user_name');
                $rootScope.user_id = LocalStorageService.get('user_id');
                SyncService.syncAndRefresh(function() {
                    $scope.$apply();
                    $state.go('app.groups');
                    LoaderService.hide();
                })
            }

            else {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString("Unable to proceed to subscribtion")
                });
            }
            
        });
    };

    

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);
});