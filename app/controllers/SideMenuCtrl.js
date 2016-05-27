App
.controller('SideMenuCtrl', function($scope, $window, $timeout, $filter, $ionicSideMenuDelegate, $ionicModal, $ionicPopup, $ionicHistory, $ionicLoading, $state, gettextCatalog, SyncService, LoginService, LocalStorageService,  SUPPORTED_LANG, tmhDynamicLocale, GroupsModel) {
    
    $scope.$on('$ionicView.beforeEnter', function(event) {
        $scope.user_email = LocalStorageService.get("user_email");
    });
    

    // FEEDBACK MODAL
    $ionicModal.fromTemplateUrl('app/templates/support_modal.html', {
        scope: $scope,
        focusFirstInput: true,
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

        var msg = $scope.modal.feedback_message;
        if(msg !== undefined && msg.length>0) {
            $ionicLoading.show();
            var fbck_data = {
                data: {
                    msg : msg,
                    user : {
                        'username': LocalStorageService.get('user_name'),
                        'email': LocalStorageService.get('user_email'),
                        'id': LocalStorageService.get('user_id')
                    },
                    app_version : LocalStorageService.get('app_version')
                }
            };

            SyncService.api_send("send_feedback", fbck_data, function(data, status) {
                $ionicLoading.hide();

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
                        template: gettextCatalog.getString("Your message could not be sent. Please check your internet status and try again.")
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
    };
    $scope.disconnect = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Disconnect'),
            template: gettextCatalog.getString('You\'ll be disconnected.'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: '<b>' + gettextCatalog.getString("Confirm") + '</b>', type: 'button-calm', onTap: function(e) { return true; } },
            ]
        });

        confirmPopup.then(function(res) {
            if(res) {
                LoginService.changeLoginStatus(false);
                $ionicSideMenuDelegate.toggleLeft();
                $state.go('landing');
            }
            
        });
    };
    $scope.openPayments = function() {
        $ionicSideMenuDelegate.toggleLeft();
        $state.go('app.payments');
    };

    $scope.openSettings = function() {
        $ionicSideMenuDelegate.toggleLeft();
        $state.go('app.settings');
    };

    $scope.openJoinGroupPopup = function() {
        if(!$scope.isOnline()) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Unable to do that!'),
                template: gettextCatalog.getString("An Internet connection is required to join a group.")
            });
            return;
        }

        $ionicSideMenuDelegate.toggleLeft(false);
        $scope.trackEvent('inAppAction', 'JoinGroupPopup', 'Open');
        $scope.joinrequest = {};
        $scope.selectLanguagePopup = $ionicPopup.show({
            templateUrl: 'app/templates/popup_joingroup.html',
            title: gettextCatalog.getString('Join a group'),
            subTitle: gettextCatalog.getString('Enter the group key below:'),
            cssClass: "joinGroupPopup",
            scope: $scope,
            buttons: [
                { 
                    text: gettextCatalog.getString('Cancel')
                },
                { 
                    text: gettextCatalog.getString('Confirm'),
                    type: 'button-calm', 
                    onTap: $scope.sendJoinRequest
                }
            ]
        });
        $scope.$watch('joinrequest.group_code', function(val) {
            $scope.joinrequest.group_code = $filter('uppercase')(val);
        }, true);
    };

    $scope.sendJoinRequest = function(e) {
        $ionicLoading.show();
        var group_code = $scope.joinrequest.group_code;
        if(group_code.length<4) {
            $ionicLoading.hide();
            e.preventDefault();
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("The group code you entered is invalid. Please check it and try again.")
            });
        }
        else {
            var data = {
                data: {
                    group_code : group_code
                }
            };
            
            SyncService.api_send("join_group", data, function(data, status) {
                $ionicLoading.hide();

                if(status==200 && typeof data.result !== 'undefined') {
                    if(data.result=="OK") {
                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Done !'),
                            template: gettextCatalog.getString("Your request has been sent. It is pending approval by a registered member of the group.")
                        });
                    }
                    else {

                        switch(data.data) {
                            case 'not_found':
                                var msg = gettextCatalog.getString("We did not find any group with this code. Please check and try again.");
                                break;
                            case 'already_member':
                                var msg = gettextCatalog.getString("You are already a member of this group !");
                                break;
                            case 'request_pending':
                                var msg = gettextCatalog.getString("Your request for this group is already pending approval. Please be patient :-)");
                                break;
                            default:
                                var msg = gettextCatalog.getString("Your request failed for an unknown reason. Please try again or contact support. Sorry !");
                        }

                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Oops !'),
                            template: msg
                        });

                    }
                    
                }
                else {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Oops !'),
                        template: gettextCatalog.getString("Your request could not be sent. Please check your internet status and try again.")
                    });
                }
            });
        }
    };
    
    $scope.shareApp = function() {
        $scope.trackEvent('inAppAction', 'ShareApp', 'Open');
        if(typeof window.plugins.socialsharing != 'undefined') {
            window.plugins.socialsharing.share(gettextCatalog.getString('Check out this app for sharing expenses with friends') + ' : https://debal.fr',null,null,'https://www.debal.fr');
        }
    };
    
    $scope.toggleLeft = function() {
        $ionicSideMenuDelegate.toggleLeft();
    };

    $scope.rateApp = function() {
        $scope.trackEvent('inAppAction', 'rateApp', 'Open');
        $ionicSideMenuDelegate.toggleLeft();

        if(ionic.Platform.isAndroid())
            var url = "https://play.google.com/store/apps/details?id=fr.debal.app";
        else if(ionic.Platform.isIOS())
            var url = "itms-apps://itunes.apple.com/app/id896184333";

        var confirmPopup = $ionicPopup.confirm({
            cancelText: gettextCatalog.getString('Cancel'),
            title: gettextCatalog.getString('Like the App?'),
            template: gettextCatalog.getString('Please support ous and take a few seconds to rate the App in the store!')
        }).then(function(res) {
            if(res) {
                window.open(url, '_system');
            }
        });
    };
});