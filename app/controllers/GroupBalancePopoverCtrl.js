App.controller('GroupBalancePopoverCtrl',
    function($scope, $http, $ionicPopup, GENERAL_CONFIG, gettextCatalog, LocalStorageService, SyncService, GroupsSecondCurrencyModel) {

    $scope.ShareGroup = function() {
        $scope.popover.hide();
        var text = gettextCatalog.getString('Accounts for group {{name}}', {name:$scope.group.name});
        var url = 'http://www.debal.fr/' + $scope.group.public_key;
        if(typeof window.plugins !== 'undefined' && typeof window.plugins.socialsharing !== 'undefined') {
            window.plugins.socialsharing.share(text, null, null, url);
        }
    };
    
    $scope.openGroupUrl = function() {
        $scope.popover.hide();
        window.open('https://debal.fr/group/' + $scope.group.public_key + '/?locale=' + LocalStorageService.get("locale") + '&utm_source=app&utm_medium=balance&utm_campaign=outbound', '_system');
    };

    $scope.openGroupStats = function() {
        $scope.trackEvent('inAppAction', 'groupStats', 'Open');
        $scope.popover.hide();
        window.open('https://debal.fr/group/' + $scope.group.public_key + '/resume/?locale=' + LocalStorageService.get("locale") + '&utm_source=app&utm_medium=balance&utm_campaign=outbound', '_system');
    }

    $scope.openSecondaryCurrencyOptions = function() {
        $scope.trackEvent('inAppAction', 'SecondaryCurrencyPopup', 'Open');
        $scope.popover.hide();
        var locale = LocalStorageService.get('locale');
        
        $scope.secondCurrency = {};
        $scope.secondCurrency.secondary_currency = $scope.group.secondary_currency;
        $scope.secondCurrency.locale_curr = (typeof $scope.currencies.EUR["name_" + locale] != 'undefined') ? locale : 'en';
        $scope.secondCurrency.popup = $ionicPopup.show({
            templateUrl: 'app/templates/popup_groupbalance_secondarycurrency.html',
            title: gettextCatalog.getString('Pick a secondary currency'),
            scope: $scope,
            buttons: [
                { 
                    text: gettextCatalog.getString('Disable'),
                    onTap: $scope.toggleSecondCurrency
                },
                { 
                    text: gettextCatalog.getString('Confirm'),
                    type: 'button-calm', 
                    onTap: $scope.setSecondCurrency
                }
            ]
        });
    };

    /* Secondary Currency Functions */
    $scope.toggleSecondCurrency = function() {
        GroupsSecondCurrencyModel.delete($scope.group.GroupId);
        $scope.group.currency_rate = null;
        $scope.group.secondary_currency = {};
    };

    $scope.setSecondCurrency = function(e) {

        if($scope.group.currency_rate) { // Replace , to .
            $scope.group.currency_rate = parseFloat($scope.group.currency_rate.toString().replace(",", "."));
        }

        if(!$scope.group.secondary_currency) {
            e.preventDefault();
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString('Please select a secondary currency')
            });
        }
            
        else if(!$scope.group.currency_rate) {
            e.preventDefault();
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString('Please enter a change rate or click the icon to download an updated rate from the web')
            });
        }

        else if(isNaN($scope.group.currency_rate)) {
            e.preventDefault();
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString('Please enter a float value for the currency rate')
            });
        }
            
        else {
            $scope.group.secondary_currency = $scope.currencies[$scope.secondCurrency.secondary_currency.id];
            $scope.group.secondary_currency.symbol = $scope.getCurrencySymbol($scope.secondCurrency.secondary_currency.id);
            $scope.setRate();
            
        }
    };

    $scope.setRate = function() {
        GroupsSecondCurrencyModel.set_second_currency($scope.group.GroupId, $scope.group.secondary_currency.id, $scope.group.currency_rate);
    };

    $scope.getExchangeRates = function() {
        $http({method: 'GET', url: GENERAL_CONFIG.CURR_RATES_URL}).success(function(data, status) {
            console.error(status);
            if(status===200 && typeof data !== 'undefined' && objectLength(data)>0 && typeof fx !== "undefined" && fx.rates) {
                LocalStorageService.set("exchange_rates", JSON.stringify(data.rates));
                LocalStorageService.set("exchange_timestamp", data.timestamp);
                LocalStorageService.set("exchange_base", data.base);
            }
            if(LocalStorageService.get("exchange_rates")) {
                fx.rates = LocalStorageService.get("exchange_rates");
                fx.base = LocalStorageService.get("exchange_base");
                $scope.group.currency_rate = fx(1).from($scope.group.currency.id).to($scope.secondCurrency.secondary_currency.id);
            }
            else
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString('Unable to download the latest rate for now. Please try again later.')
                });
        }).error(function() {
            if(LocalStorageService.get("exchange_rates")) {
                fx.rates = LocalStorageService.get("exchange_rates");
                fx.base = LocalStorageService.get("exchange_base");
                $scope.group.currency_rate = fx(1).from($scope.group.currency.id).to($scope.secondCurrency.secondary_currency.id);
            }
            else
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Error'),
                    template: gettextCatalog.getString('Unable to download the latest rate for now. Please try again later.')
                });
        });
    };
    /* End Secondary Currency Functions */
});