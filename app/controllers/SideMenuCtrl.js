App
.controller('SideMenuCtrl', function($ionicSideMenuDelegate, $rootScope, $scope,$window, $ionicModal, $ionicPopup, $state, gettextCatalog, SyncService, LocalStorageService, LoaderService, SUPPORTED_LANG, tmhDynamicLocale) {

 $scope.user_email = LocalStorageService.get("user_email");
    // Side menu stuff
    // FEEDBACK MODAL
    $ionicModal.fromTemplateUrl('app/templates/support_modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function(modal) {
        $scope.modal = modal;
    });

    $scope.openModal = function() {
        $scope.modal.show();
        if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
            cordova.plugins.Keyboard.close();
        $scope.toggleLeft();
    };
    $scope.closeModal = function() {
        $scope.modal.hide();
    };

    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });

    $scope.sendFeedback = function() {

        var msg = $scope.modal.feedback_message
        if(msg !== undefined && msg.length>0) {
            LoaderService.show();
            var fbck_data = {
                data: {
                    msg : msg,
                    user : LocalStorageService.get('user_email'),
                    app_version : LocalStorageService.get('app_version')
                }
            }

            SyncService.api_send("send_feedback", fbck_data, function(data, status) {
                LoaderService.hide();

                if(status==200 && data.result=="OK") {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Thank you !'),
                        template: gettextCatalog.getString("Your message has been sent. Thank you!")
                    });
                    
                    $scope.modal.hide();
                    delete $scope.modal.feedback_message;
                }
                else {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Oops !'),
                        template: gettextCatalog.getString("Message could not be sent. Please check your internet status and try again.")
                    });
                }
            });
        }
        else {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Message is empty!'),
                template: gettextCatalog.getString("Please type a message.")
            });
        }
    }
    $scope.disconnect = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Disconnect'),
            template: gettextCatalog.getString('You\'ll be disconnected.'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: '<b>' + gettextCatalog.getString("Confirm") + '</b>', type: 'button-positive', onTap: function(e) { return true; } },
            ]
        });

        confirmPopup.then(function(res) {
            if(res) {
                $ionicSideMenuDelegate.toggleLeft();
                LocalStorageService.clear('login');
                $state.go('login');
            }
            
        });
    }

    $scope.selectLanguage = function() {
        $scope.selectLanguagePopup = $ionicPopup.show({
            templateUrl: 'app/templates/select_language.html',
            title: gettextCatalog.getString('Select a language'),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
            ]
        });
    }

    $scope.selectLanguage2 = function() {
        $scope.selectLanguagePopup = $ionicPopup.show({
            templateUrl: 'app/templates/select_language2.html',
            title: gettextCatalog.getString('Rejoindre un groupe'),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
            ]
        });
    }
    
    $scope.shareApp = function() {
        if(typeof window.plugins.socialsharing != 'undefined') {
            window.plugins.socialsharing.share(gettextCatalog.getString('App for sharing expenses with friends') + ' : http://debal.fr',null,null,'http://www.debal.fr');
        }
    }

    $scope.changeLanguage = function(device_lang) {

        if(SUPPORTED_LANG.indexOf($scope.device_lang)==-1)
            device_lang = "en";

        LocalStorageService.set("locale", device_lang);

        gettextCatalog.setCurrentLanguage(device_lang);

        tmhDynamicLocale.set(device_lang);

        $scope.device_lang = device_lang;

        $scope.selectLanguagePopup.close();
        $ionicSideMenuDelegate.toggleLeft();
        $window.location.reload();
    }

    
    $scope.toggleLeft = function() {
        $ionicSideMenuDelegate.toggleLeft();
    };


    $scope.rateApp = function() {
        if(ionic.Platform.isAndroid())
            var url = "https://play.google.com/store/apps/details?id=fr.debal.app";
        else if(ionic.Platform.isIOS())
            var url = "itms-apps://itunes.apple.com/app/id896184333";

        $ionicSideMenuDelegate.toggleLeft();
        window.open(url, '_system');
    }

    // End side menu stuff
});