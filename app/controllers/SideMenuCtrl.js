App
.controller('SideMenuCtrl', function($ionicSideMenuDelegate, $rootScope, $scope, $ionicModal, $ionicPopup, $state, gettextCatalog, SyncService, LocalStorageService, LoaderService, SUPPORTED_LANG, tmhDynamicLocale) {

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
                        title: gettextCatalog.getString('Merci !'),
                        template: gettextCatalog.getString("Votre message nous a bien été transmis. Merci !")
                    });
                    
                    $scope.modal.hide();
                    delete $scope.modal.feedback_message;
                }
                else {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Oups !'),
                        template: gettextCatalog.getString("Le message n'a pas été transmis. Merci de vérifier votre connexion à Internet et réessayer.")
                    });
                }
            });
        }
        else {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Message vide !'),
                template: gettextCatalog.getString("Merci d'entrer un message.")
            });
        }
    }
    $scope.disconnect = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Déconnexion'),
            template: gettextCatalog.getString('Vous allez être deconnecté de votre compte.'),
            buttons: [
                { text: gettextCatalog.getString('Annuler'), onTap: function(e) { return false; } },
                { text: '<b>' + gettextCatalog.getString("Confirmer") + '</b>', type: 'button-positive', onTap: function(e) { return true; } },
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
            title: gettextCatalog.getString('Choisissez la langue'),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Annuler') },
            ]
        });
    }
    
    $scope.shareApp = function() {
        if(typeof window.plugins.socialsharing != 'undefined') {
            window.plugins.socialsharing.share(gettextCatalog.getString('Application pour faire ses comptes entre amis') + ' : http://debal.fr',null,null,'http://www.debal.fr');
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