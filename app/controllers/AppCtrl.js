/* global App */

App
.controller('AppCtrl',
    function($state, $rootScope, $scope, $ionicHistory, $ionicLoading, $ionicPopup, $ionicSlideBoxDelegate, gettextCatalog, SQLiteService, LocalStorageService, initService, LoginService, SyncService, CURRENCIES_SYMBOLS, GENERAL_CONFIG) {

    // Analytics
    $scope.trackView = function() {
        if (typeof analytics !== 'undefined')
            analytics.trackView($state.current.name);
    }

    $scope.trackEvent = function(Category, Action, Label) {
        if (typeof analytics !== 'undefined')
            analytics.trackEvent(Category, Action, Label);
    }

    $scope.getGroupThumbnailColor = function(groupName) {
        if(typeof groupName === 'undefined')
            return;
        
        var colors = ["#66D8BA","#f16364","#f58559","#f9a43e","#e4c62e","#67bf74","#59a2be","#2093cd","#ad62a7"];

        hashCode = function(strInput) {
            var str = strInput.toUpperCase();
            var hash = 0;
            if (str.length === 0) return hash;
            for (i = 0; i < str.length && i<3; i++) {
                char = str.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash;
            }
            return hash;
        };
        
        groupName_number = Math.abs(hashCode(groupName)*1)%(colors.length);
        return colors[groupName_number];
    };


    $scope.initApp = function() {
        var app_version = LocalStorageService.get('app_version');
        
        // Not Authed = RECREATE DB
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
        // Authed + APP UPDATED AND RECREATION REQUIRED = RECREATE DB and Login and Download data
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
        
        // Authed
        else {
            initService.init(function() {

                function refreshAndRedirect() {
                    SyncService.syncAndRefresh(function(result) {
                        // Logged in but in pre-auth screen
                        if($state.current.name==="landing" || $state.current.name==="login" || $state.current.name==="register")
                            $state.go('app.groups');

                        $rootScope.$broadcast('startSyncInterval');
                    }, false);
                }

                // Authed + Updated to 1.3 = DONT RECREATE (BUS REPORTED) BUT Create user_details Table
                if(app_version!==GENERAL_CONFIG.APP_VERSION && GENERAL_CONFIG.APP_VERSION>="1.3.0") {
                    console.error("SWITCH TO 1.3 > CREATE USERS_DETAILS");
                    var SQLite = (new SQLiteService());
                    SQLite._executeSQL(
                        'CREATE TABLE IF NOT EXISTS `users_details` (\n\
                        `id` INTEGER,\n\
                        `user_id` INTEGER,\n\
                        `last_name` TEXT,\n\
                        `first_name` TEXT,\n\
                        `birthday` TEXT,\n\
                        `nationality` TEXT,\n\
                        `country_of_residence` TEXT,\n\
                        `mangopay_user_id` TEXT,\n\
                        `mangopay_wallet_id` TEXT,\n\
                        `mangopay_card_id` TEXT,\n\
                        `mangopay_bank_id` TEXT,\n\
                        UNIQUE (user_id) ON CONFLICT REPLACE)', refreshAndRedirect
                    );
                }

                else
                    refreshAndRedirect();
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