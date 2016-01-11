App
.controller('SettingsCtrl', function($scope, $rootScope, $state, $ionicPopup, $ionicLoading, $ionicHistory, UsersModel, SyncService, LocalStorageService, gettextCatalog, tmhDynamicLocale, SUPPORTED_LANG) {

    $scope.settings = {'keyboard':(LocalStorageService.get("setting_tel_keyboard")==="true")};
    $scope.current_user = {'email':LocalStorageService.get("user_email"), 'id':LocalStorageService.get("user_id"), 'username':LocalStorageService.get("user_name")};

    $scope.changeLanguage = function(device_lang) {
        if(SUPPORTED_LANG.indexOf($rootScope.device_lang)==-1)
            device_lang = "en";

        LocalStorageService.set("locale", device_lang);

        gettextCatalog.setCurrentLanguage(device_lang);

        $scope.languages = {
            current: device_lang
        };

        tmhDynamicLocale.set(device_lang);

        $rootScope.device_lang = device_lang;
        $ionicHistory.clearHistory();
        $state.go('app.groups', null, {reload:true});
    };

    $scope.isLanguage = function(lang) {
        return $rootScope.device_lang === lang;
    }

    $scope.setPhoneKeyboard = function(bool) {
        LocalStorageService.set("setting_tel_keyboard", bool);
        $scope.settings.keyboard = bool;
    };

    $scope.changeUsername = function() {
        $scope.data = {};
        var myPopup = $ionicPopup.show({
            template: '<input autofocus type="text" ng-model="data.username" class="add-user-input" required="true">',
            title: gettextCatalog.getString('Edit your username'),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: gettextCatalog.getString('Save'),
                    type: 'button-calm',
                    onTap: function(e) {
                        if (!$scope.data.username)
                            e.preventDefault();
                        else
                            return $scope.data.username;
                    }
                },
            ]
        });
        myPopup.then(function(res) {
            if(res) {
                $scope.current_user.username = $scope.data.username;
                UsersModel.getUserId($scope.current_user.id, function(data) {
                    if(data.length>0 && data[0].UserId!==null) {
                        var UserId = data[0].UserId;
                        UsersModel.update({username:$scope.data.username, UserId:UserId}, function(res) {
                            console.error(res);
                        })
                    }
                })
            }
        });
    }

    $scope.changeEmail = function() {
        if(!$scope.isOnline()) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Unable to do that!'),
                template: gettextCatalog.getString("An Internet connection is required to change email.")
            });
            return;
        }

        $scope.data = {};
        var myPopup = $ionicPopup.show({
            template: '<input autofocus type="text" ng-model="data.email" class="add-user-input" required="true">',
            title: gettextCatalog.getString('Edit your email address'),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: gettextCatalog.getString('Save'),
                    type: 'button-calm',
                    onTap: function(e) {
                        if (!$scope.data.email)
                            e.preventDefault();
                        else
                            return $scope.data.email;
                    }
                },
            ]
        });
        myPopup.then(function(res) {
            $ionicLoading.show();
            if(res) {
                UsersModel.getUserId($scope.current_user.id, function(data) {
                    if(data.length>0 && data[0].UserId!==null) {
                        var UserId = data[0].UserId;
                        $scope.data.email = $scope.data.email.toLowerCase();
                        // test availability
                        var dataToSend = {
                            data: {
                                email: $scope.data.email,
                            }
                        };
                        SyncService.api_send('edit_email', dataToSend, function(data, status) {
                            if(status==200 && data.result=="OK" && data.data) {
                                
                                $ionicLoading.hide();

                                if(data.data == "changed") {
                                    template_msg =  gettextCatalog.getString('Your email has been changed.');
                                    var old_email = $scope.current_user.email;
                                    var old_credentials = atob(LocalStorageService.get("user_basic"));
                                    var new_credentials = btoa(old_credentials.replace(old_email+":", $scope.data.email +":"));
                                    LocalStorageService.set("user_email", $scope.data.email);
                                    LocalStorageService.set("user_basic", new_credentials);
                                    $rootScope.user_email = $scope.data.email;
                                    $scope.current_user.email = $scope.data.email;
                                    UsersModel.update({email:$scope.data.email, UserId:UserId});
                                }
                                else if(data.data == "already_taken")
                                    template_msg =  gettextCatalog.getString('This email is already used by one of our users.');
                                
                                $ionicPopup.alert({
                                    title: gettextCatalog.getString('Edit your email address'),
                                    template: template_msg
                                });
                            }

                            else {
                                $ionicLoading.hide();
                                $ionicPopup.alert({
                                    title: gettextCatalog.getString('Error'),
                                    template: gettextCatalog.getString('Unable to edit your email. Maybe your email format is invalid or the server did not respond.')
                                });
                            }
                        });
                    }
                })
            }
        });
    }
    $scope.trackView();
});