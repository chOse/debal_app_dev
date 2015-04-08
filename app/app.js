/* global Connection, analytics, ionic, angular */

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

    .state('landing', {
        url: "/landing",
        templateUrl: 'app/views/landing.html',
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
        cache: false,
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
        cache: false,
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
        cache: false,
        views: {
        'menuContent' :{
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
            
            var online = (typeof(navigator.online)!=='undefined') ? navigator.onLine : (typeof(navigator.network)!=='undefined') ? (navigator.network.connection.type !== Connection.NONE) : true;
            var logged_in = LocalStorageService.get("login");

            if(online && logged_in==="true" && !appPaused) {

                syncCounter++;
                if(syncCounter%syncForcePeriod===0)
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
                
            if(SUPPORTED_LANG.indexOf(device_lang)===-1)
                device_lang = "en";

            //$rootScope.$apply(function() {

                gettextCatalog.setCurrentLanguage(device_lang);

                if(typeof device_locale !== 'undefined') {
                    tmhDynamicLocale.set(device_locale);
                }
            //});
        };

        if(typeof(LocalStorageService.get("locale"))!=='undefined') {
            this.loadLocale({value:LocalStorageService.get("locale")});
        }

        else if(typeof(navigator.globalization) !== "undefined") {
            navigator.globalization.getLocaleName(this.loadLocale, null);
        }

        else {
            this.loadLocale({value:"en"});
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

            else if($state.current.name==="app.groupexpenses") {
                $state.go('app.groups');
            }
        }
        
        if(typeof cordova !== 'undefined' && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.intercom !== "undefined") {
            cordova.plugins.intercom.startSession();
            if(typeof LocalStorageService.get('user_email') !== 'undefined' && LocalStorageService.get('user_name') !== 'undefined') {
                cordova.plugins.intercom.updateAttributes({
                    email: LocalStorageService.get('user_email'),
                    name: LocalStorageService.get('user_name')
                });
            }
        }

        if (typeof analytics !== 'undefined') {
            analytics.startTrackerWithId('UA-44005158-2');
            analytics.setUserId(LocalStorageService.get('user_id'));
        }
        
        
    });
});