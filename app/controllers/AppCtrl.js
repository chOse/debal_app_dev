/* global App */

App
.controller('AppCtrl',
    function($state, $rootScope, $scope, $ionicHistory, $ionicLoading, $ionicPopup, $ionicSlideBoxDelegate, gettextCatalog, LocalStorageService, initService, LoginService, SyncService, CURRENCIES_SYMBOLS, GENERAL_CONFIG) {

    // Analytics
    $scope.trackView = function() {
        if (typeof analytics !== 'undefined')
            analytics.trackView($state.current.name);
    }

    $scope.trackEvent = function(Category, Action, Label) {
        if (typeof analytics !== 'undefined')
            analytics.trackEvent(Category, Action, Label);
    }


    $scope.initApp = function() {
        var app_version = LocalStorageService.get('app_version');
        if(LoginService.isLogged()!=="true") {
            console.error("no credentials found, reiniting");
            initService.reInit(function() {
                $rootScope.$broadcast('startSyncInterval');
            }); 
            // Disconnected and not in pre-auth screen
            if($state.current.name!=="landing" && $state.current.name!=="login" && $state.current.name!=="register") {
                setTimeout(function() {
                     return $state.go('landing');
                }, 0); // Don't know why it doesn't redirect without setTimeout...
            }
        }
        // RECREATE DB IF APP UPDATED
        else if(!update_popup_triggered && app_version!==GENERAL_CONFIG.APP_VERSION && GENERAL_CONFIG.RECREATE_APP_VERSIONS.indexOf(app_version)>-1) {
            console.error("app version mismatch");
            $ionicLoading.hide();
            update_popup_triggered = true;

            initService.reInit(function() {
                $ionicLoading.show({templateUrl:false, template:'<ion-spinner></ion-spinner><p>' +  gettextCatalog.getString('Downloading your data from server...') +'</p>', duration:100000});
                
                SyncService.syncAndRefresh(function(result) {
                    $ionicLoading.hide();
                    $state.go('app.groups', {}, {reload:true});
                    $rootScope.$broadcast('startSyncInterval');
                }, false);
            }, false);   
        }
        else {
            initService.init(function() {
                SyncService.syncAndRefresh(function(result) {
                    // Logged in but in pre-auth screen
                    if($state.current.name==="landing" || $state.current.name==="login" || $state.current.name==="register")
                        $state.go('app.groups');

                    $rootScope.$broadcast('startSyncInterval');
                }, false);
            });
        }
    }
    
    var update_popup_triggered = false;
    $scope.initApp();


    // Handle back top-left button
    $rootScope.goBack = function() { // Using rootScope because it is called from in app.js's $ionicPlatformReady
        switch($state.current.name) {
            case 'app.group.tabs.expenses':
                $state.go('app.groups');
                break;
            case 'app.group.addexpense':
                return ($ionicSlideBoxDelegate.currentIndex()===1) ? $ionicSlideBoxDelegate.previous() : $ionicHistory.goBack();
            case 'app.group.editexpense':
                return ($ionicSlideBoxDelegate.currentIndex()===1) ? $ionicSlideBoxDelegate.previous() : $ionicHistory.goBack();
            default:
                return $ionicHistory.goBack();
        }
    };

    $scope.getPreviousTitle = function() {
        switch($state.current.name) {
            case 'app.group.tabs.expenses':
                return gettextCatalog.getString("Groups");
            case 'app.group.addexpense':
                return ($ionicSlideBoxDelegate.currentIndex()===1) ? gettextCatalog.getString("Expense") : $ionicHistory.backTitle();
            case 'app.group.editexpense':
                return ($ionicSlideBoxDelegate.currentIndex()===1) ? gettextCatalog.getString("Expense") : $ionicHistory.backTitle();
            default:
                return $ionicHistory.backTitle();
        }
    },

    $scope.isOnline = function() {
        if(window.Connection)
            return (navigator.connection.type !== Connection.NONE);
        else
            return true;
    };

    // Currency Symbol
    $scope.getCurrencySymbol = function(currency_id) {
        return (typeof(CURRENCIES_SYMBOLS[currency_id])!=='undefined') ? CURRENCIES_SYMBOLS[currency_id] : currency_id;
    };

    // Pull to refresh
    $scope.doRefresh = function() {
        SyncService.syncAndRefresh(function(result) {
            $scope.$broadcast('scroll.refreshComplete');
        });
        setTimeout(function() { $scope.$broadcast('scroll.refreshComplete'); }, 10000);
    };

});