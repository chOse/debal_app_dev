var App = angular.module('spendingsManager', ['tmh.dynamicLocale', 'ionic', 'spendingsManager.config', 'gettext', 'spendingsManager.db'])
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

.config(function($stateProvider, $urlRouterProvider) {

$stateProvider
    .state('login', {
        url: "/login",
        templateUrl: 'app/views/login.html',
        controller: 'LoginCtrl'
    })

    .state('register', {
        url: "/register",
        templateUrl: 'app/views/register.html',
        controller: 'LoginCtrl'
    })

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: 'app/views/sidemenu.html',
      controller: 'SideMenuCtrl'
    })

    .state('app.groups', {
        url: "/groups",
        views: {
        'menuContent' :{
          templateUrl: 'app/views/groups.html',
          controller: 'GroupsCtrl'
        }
      }
    })
    .state('app.creategroup', {
        url: "/creategroup",
        views: {
        'menuContent' :{
          templateUrl: 'app/views/creategroup.html',
          controller: 'CreategroupCtrl'
            }
        }
    })
    .state('app.groupexpenses', {
        url: "/groupexpenses/:GroupId",
        views: {
        'menuContent' :{
          templateUrl: 'app/views/groupexpenses.html',
          controller: 'GroupexpensesCtrl'
            }
        }
    })
    .state('app.addexpense', {
        url: "/addexpense/:GroupId",
        views: {
        'menuContent' :{
            templateUrl: 'app/views/addexpense.html',
            controller: 'SaveExpenseCtrl'
            }
        }
    })
    .state('app.editgroup', {
        url: "/editgroup/:GroupId",
        views: {
        'menuContent' :{
            templateUrl: 'app/views/editgroup.html',
            controller: 'EditgroupCtrl'
            }
        }
    })
    .state('app.editexpense', {
        url: "/editexpense/:GroupId/:EntryId",
        views: {
        'menuContent' :{
            templateUrl: 'app/views/addexpense.html',
            controller: 'SaveExpenseCtrl'
            }
        }
    });
    
    $urlRouterProvider.otherwise("/register");
    
})
.run(function($ionicPlatform, $state, $rootScope, $ionicSideMenuDelegate, $interval, tmhDynamicLocale, LocalStorageService, initService, SyncService, gettextCatalog, SUPPORTED_LANG) {


    $ionicPlatform.ready(function() {

        // Sync constants
        var syncInterval = 5000;
        var syncForcePeriod = 12; // Will force sync each syncForcePeriod * syncInterval ms
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

        function appBackOnline() {
            console.error("App back on line");
            initService.init(function() {
                syncCounter = 0;
                handleSync();
            });
        }

        appBackOnline();

        function handleSync() {
            
            var online = (typeof(navigator.online)!=='undefined') ? navigator.onLine : (typeof(navigator.network)!=='undefined') ? (navigator.network.connection.type != Connection.NONE) : true;
            var logged_in = LocalStorageService.get("login");

            if(online && logged_in==="true" && !appPaused) {

                syncCounter++;
                if(syncCounter%syncForcePeriod==0)
                    var saveBandwidth = false;
                else
                    var saveBandwidth = true;

                SyncService.syncAndRefresh(function(result) {

                }, saveBandwidth);
            }
        }

        this.loadLocale = function(locale) {

            device_locale = locale.value.toLowerCase();
            device_lang = device_locale.split("-")[0];

            LocalStorageService.set("locale", device_lang);
                
            if(SUPPORTED_LANG.indexOf(device_lang)==-1)
                device_lang = "en";

            $rootScope.$apply(function() {

                gettextCatalog.setCurrentLanguage(device_lang);

                if(typeof device_locale != 'undefined') {
                    tmhDynamicLocale.set(device_locale);
                }
            });
        };

        if(typeof(navigator.globalization) !== "undefined") {
            navigator.globalization.getLocaleName(this.loadLocale, null);
        }

        else {
            $rootScope.$apply(function() {gettextCatalog.setCurrentLanguage("en")});
            LocalStorageService.set("locale", "en");
        }

        // Handle back button
        $ionicPlatform.onHardwareBackButton(handleBackButton);

        function handleBackButton(e) {
            e.preventDefault();

            if($ionicSideMenuDelegate.isOpen()) {
                e.preventDefault();
                $ionicSideMenuDelegate.toggleLeft();
            }

            else if($state.current.name=="app.groups" || $state.current.name=="login" || $state.current.name=="register") {
                e.preventDefault();
                ionic.Platform.exitApp();
            }

            else if($state.current.name=="app.groupexpenses") {
                $state.go('app.groups');
            }
        }

        if (typeof analytics !== 'undefined') {
            analytics.startTrackerWithId('UA-44005158-2')
        }
    });
})