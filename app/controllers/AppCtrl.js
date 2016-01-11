/* global App */

App
.controller('AppCtrl',
    function($state, $scope, $ionicHistory, $ionicSlideBoxDelegate, gettextCatalog, SyncService, CURRENCIES_SYMBOLS) {


    // Analytics
    $scope.trackView = function() {
        if (typeof analytics !== 'undefined')
            analytics.trackView($state.current.name);
    }

    $scope.trackEvent = function(Category, Action, Label) {
        if (typeof analytics !== 'undefined')
            analytics.trackEvent(Category, Action, Label);
    }

    // Handle back top-left button
    $scope.goBack = function() {
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