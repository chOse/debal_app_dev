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
            controller: 'AddexpenseCtrl'
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
            templateUrl: 'app/views/editexpense.html',
            controller: 'EditexpenseCtrl'
            }
        }
    });
    
    $urlRouterProvider.otherwise("/register");
    
})
.run(function($ionicPlatform, $state, $rootScope, $ionicSideMenuDelegate, tmhDynamicLocale, LocalStorageService, initService, GENERAL_CONFIG, gettextCatalog) {


    $ionicPlatform.ready(function() {

        this.loadLocale = function(locale) {

            device_locale = locale.value;
            device_lang = device_locale.split("-")[0];

            LocalStorageService.set("locale", device_lang);

            var supported_lang = ['fr', 'en'];
                
            if(supported_lang.indexOf(device_lang)==-1)
                device_lang = "en";

            $rootScope.$apply(function() {

                gettextCatalog.setCurrentLanguage(device_lang);

                if(typeof device_locale != 'undefined') {
                    tmhDynamicLocale.set(device_locale.toLowerCase());
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
        document.addEventListener("backbutton", function(e) {
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


        }, false);

        if (typeof analytics !== 'undefined') {
            analytics.startTrackerWithId('UA-44005158-2')
        }

    });
})