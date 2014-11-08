var App = angular.module('spendingsManager', ['ionic', 'spendingsManager.config', 'gettext', 'spendingsManager.db'])
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
.run(function($ionicPlatform, $state, $ionicSideMenuDelegate, LocalStorageService, initService, GENERAL_CONFIG, gettextCatalog) {



    $ionicPlatform.ready(function() {

        if(typeof(navigator.globalization) !== "undefined") {

            navigator.globalization.getPreferredLanguage(function(language) {
                locale = (language.value).split("-")[0];

                LocalStorageService.set("locale", locale);
                gettextCatalog.setCurrentLanguage(locale);

            }, null);

        }

        else {
            locale = "en";
            LocalStorageService.set("locale", locale);
            gettextCatalog.setCurrentLanguage(locale);
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

           /* else
                navigator.app.backHistory();*/

        }, false);

        

        if (typeof analytics !== 'undefined') {
            analytics.startTrackerWithId('UA-44005158-2')
        }




    });
})
.filter('currency', function(CURRENCIES_SYMBOLS) {
    return function(number, currencyCode) {
        var thousand, decimal, format;
    
        if (locale == "fr") {
            thousand = " ";
            decimal = ",";
            format = "%v %s";
        }

        else {
            thousand = ",";
            decimal = ".";
            format = "%s %v";
        };

        var symbol = (CURRENCIES_SYMBOLS[currencyCode]) ? CURRENCIES_SYMBOLS[currencyCode] : currencyCode;

        return accounting.formatMoney(number, symbol, 2, thousand, decimal, format);

    };
  });

/*
window.onerror = function(message, url, lineNumber) {  
  alert(message + "url" + url + "line" + lineNumber);
  return true;
}; */