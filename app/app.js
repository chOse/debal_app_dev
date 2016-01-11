/* global Connection, analytics, ionic, angular */

var App = angular.module('Debal', ['tmh.dynamicLocale', 'ionic', 'Debal.config', 'gettext', 'Debal.db'])
.filter('isEmpty', function () {
    var bar;
    return function (obj) {
        for (bar in obj) {
            if (obj.hasOwnProperty(bar)) {
                return false;
            }
        }
        return true;
    };
})
.constant('$ionicLoadingConfig', {
    templateUrl: "app/templates/ion-spinner.html",
    duration: 5000,
    noBackdrop: true
})
.config(function($stateProvider, $urlRouterProvider) {

$stateProvider
    .state('login', {
        cache: false,
        url: "/login",
        templateUrl: 'app/views/login.html',
        controller: 'LoginCtrl'
    })

    .state('register', {
        cache: false,
        url: "/register",
        templateUrl: 'app/views/register.html',
        controller: 'LoginCtrl'
    })

    .state('landing', {
        cache: false,
        url: "/landing",
        templateUrl: 'app/views/landing.html',
        controller: 'LoginCtrl'
    })

    .state('app', {
        url: "/app",
        abstract: true,
        data: {
            sidemenu: true
        },
        templateUrl: 'app/views/sidemenu.html',
        controller: 'SideMenuCtrl'
    })
    
    .state('app.groups', {
        url: "/groups",
        cache: false,
        views: {
        'menuContent' :{
          templateUrl: 'app/views/groups.html',
          controller: 'GroupsCtrl'
        }
      }
    })
    .state('app.settings', {
        url: "/settings",
        cache: false,
        views: {
        'menuContent' :{
          templateUrl: 'app/views/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('app.settings-language', {
        url: "/settings/language",
        cache: false,
        views: {
        'menuContent' :{
          templateUrl: 'app/views/settings-language.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('app.settings-keypad', {
        url: "/settings/keypad",
        cache: false,
        views: {
        'menuContent' :{
          templateUrl: 'app/views/settings-keypad.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('app.creategroup', {
        url: "/creategroup",
        cache: false,
        views: {
        'menuContent' :{
          templateUrl: 'app/views/creategroup.html',
          controller: 'CreategroupCtrl'
            }
        }
    })
    .state('app.group', {
        url: "/group/:GroupId",
        cache: false,
        views: {
            'menuContent' : {
                templateUrl: "app/views/group.html",
                controller: 'GroupCtrl'
            }
        }
        
    })
    .state('app.group.tabs', {
        cache: false,
        views: {
            'groupContent' : {
                templateUrl: "app/views/group-tabs.html",
            }
        }
    })

    .state('app.group.tabs.expenses', {
        url: '/expenses',
        views: {
            'tabsContent': {
                templateUrl: 'app/views/group-expenses.html',
                controller: 'GroupExpensesCtrl'
            }
        }
    })
    .state('app.group.tabs.balance', {
        url: '/balance',
        cache: false,
        views: {
            'tabsContent': {
                templateUrl: 'app/views/group-balance.html',
                controller: 'GroupBalanceCtrl'
            }
        }
    })
    .state('app.group.tabs.members', {
        url: '/members',
        cache: false,
        views: {
            'tabsContent': {
                templateUrl: 'app/views/group-members.html',
                controller: 'GroupMembersCtrl'
            }
        }
    })
    .state('app.group.tabs.settings', {
        url: '/settings',
        cache: false,
        views: {
            'tabsContent': {
                templateUrl: 'app/views/group-settings.html',
                controller: 'GroupSettingsCtrl'
            }
        }
    })

    .state('app.group.addexpense', {
        url: "/addexpense",
        cache: false,
        views: {
            'groupContent' : {
                templateUrl: 'app/views/addexpense.html',
                controller: 'SaveExpenseCtrl'
                }
            }
    })
    .state('app.group.editexpense', {
        url: "/editexpense/:EntryId",
        cache: false,
        views: {
            'groupContent' :{
                templateUrl: 'app/views/addexpense.html',
                controller: 'SaveExpenseCtrl'
            }
        }
    });
    
    $urlRouterProvider.otherwise("/landing");
    
})
.config(function($ionicConfigProvider) {
    $ionicConfigProvider.backButton.text(true);
    $ionicConfigProvider.views.forwardCache(true);
    $ionicConfigProvider.backButton.previousTitleText(true);
    $ionicConfigProvider.tabs.position('bottom');
})
.run(function($ionicPlatform, $state, $rootScope, $ionicLoading, $ionicPopup, $ionicSideMenuDelegate, $interval, tmhDynamicLocale, LocalStorageService, LoginService, initService, SyncService, gettextCatalog, GENERAL_CONFIG, SUPPORTED_LANG) {

    $ionicPlatform.ready(function() {

        this.loadLocale = function(locale) {
            device_locale = locale.value.toLowerCase();
            device_lang = device_locale.split("-")[0];
                
            if(SUPPORTED_LANG.indexOf(device_lang)===-1)
                device_lang = "en";

            LocalStorageService.set("locale", device_lang);
            $rootScope.device_lang = device_lang;

            gettextCatalog.setCurrentLanguage(device_lang);

            if(typeof device_locale !== 'undefined') {
                tmhDynamicLocale.set(device_locale);
            }
        };

        if(LocalStorageService.get("locale")) {
            this.loadLocale({value:LocalStorageService.get("locale")});
        }

        else if(typeof(navigator.globalization) !== "undefined") {
            navigator.globalization.getLocaleName(this.loadLocale, null);
        }

        else {
            this.loadLocale({value:"en"});
        }

        // Sync constants
        var syncInterval = 5000;
        var syncForcePeriod = 12; // Will force sync (if not blocked) each syncForcePeriod * syncInterval ms
        var syncCounter = 0;
        var appPaused = false;

        // Reset counter when app synced
        $rootScope.$on('synced', function(event) {
            syncCounter = 0;
        });

        var appSync = $interval(handleSync, syncInterval);

        var appPause = $ionicPlatform.on('pause', appPauseFunction);
        var appResume = $ionicPlatform.on('resume', appResumeFunction);
        var appOnline = $ionicPlatform.on('online', appBackOnline);

        function appPauseFunction() {
            appPaused = true;
        }

        function appResumeFunction() {
            appPaused = false;
            appBackOnline();
        }

        var update_popup_triggered = false;

        function appBackOnline() {
            console.error("App back on line");

            // RECREATE DB IF APP UPDATED
            var app_version = LocalStorageService.get('app_version');
            if(!update_popup_triggered && app_version!==GENERAL_CONFIG.APP_VERSION && GENERAL_CONFIG.RECREATE_APP_VERSIONS.indexOf(app_version)>-1) {
                console.error("app version mismatch");
                update_popup_triggered = true;
                initService.reInit(function() {
                    if(LoginService.isLogged()==="true") {
                        appPaused = true;
                        $ionicPopup.alert({
                            title: gettextCatalog.getString('App updated'),
                            template: gettextCatalog.getString('Thanks for updating the app! It will now refresh your data from server. Enjoy!')
                        }).then(function(res) {
                            $ionicLoading.show({templateUrl:false, template:'<ion-spinner></ion-spinner><p>' +  gettextCatalog.getString('Downloading your data from server...') +'</p>', duration:100000});
                            appPaused = false;
                            handleSync(function() {
                                $ionicLoading.hide();
                                $state.go('app.groups');
                            }, false);
                        });
                    }
                }, false);
                
            }

            else if(LoginService.isLogged()==="true") {
                initService.init(function() {
                    syncCounter = 0;
                    handleSync(function() {
                        if($state.current.name=="login" || $state.current.name=="landing" || $state.current.name=="register")
                            $state.go('app.groups');
                    }, false);
                });
            }

            else {
                console.error("no credentials found, reiniting");
                initService.reInit();
            }

            // Analytics
            if (typeof analytics !== 'undefined') {
                analytics.startTrackerWithId('UA-44005158-2');

                if(LocalStorageService.get("user_id"))
                    analytics.setUserId(LocalStorageService.get('user_id'));
            }

            // Intercom
            if(typeof intercom != 'undefined') {
                intercom.registerIdentifiedUser({userId: LocalStorageService.get("user_id")});
                if(LoginService.isLogged()==="true")
                    intercom.updateUser({ email: user_email, name: user_name });
            }
        }

        appBackOnline();

        function handleSync(callback, saveBandwidth) {
            var online = (typeof(navigator.online)!=='undefined') ? navigator.onLine : (typeof(navigator.network)!=='undefined') ? (navigator.network.connection.type !== Connection.NONE) : true;
            var logged_in = LocalStorageService.get("login");

            if(online && logged_in==="true" && !appPaused) {

                syncCounter++;
                
                if(typeof saveBandwidth == 'undefined')
                    var saveBandwidth = (syncCounter%syncForcePeriod!==0);

                SyncService.syncAndRefresh(function(result) {
                    // calling handleSync with $interval adds iteration int as parameter
                    if(callback && typeof callback=='function')
                        callback();

                }, saveBandwidth);
            }
            else if(callback && typeof callback=='function')
                callback();

        }

        // Handle back button
        $ionicPlatform.onHardwareBackButton(handleBackButton);

        function handleBackButton(e) {
            e.preventDefault();

            if($ionicSideMenuDelegate.isOpen()) {
                e.preventDefault();
                $ionicSideMenuDelegate.toggleLeft();
            }

            else if($state.current.name==="app.groups" || $state.current.name==="login" || $state.current.name==="register") {
                e.preventDefault();
                ionic.Platform.exitApp();
            }

            else $rootScope.goBack();
        }

        
    });
});