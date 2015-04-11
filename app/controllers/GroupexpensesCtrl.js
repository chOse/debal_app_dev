App.controller('GroupexpensesCtrl',
    function($scope, $stateParams, $rootScope, $state, $ionicSideMenuDelegate, $ionicNavBarDelegate, $ionicPopup, $location, $ionicTabsDelegate, gettextCatalog, EntriesModel, GroupsModel, CURRENCIES_LIST, CURRENCIES_SYMBOLS, LoaderService, LocalStorageService) {

    $ionicSideMenuDelegate.canDragContent(true);

    $scope.GroupId = $stateParams.GroupId;
    $scope.group_data = [];
    $scope.membersNames = [];

    $scope.locale = LocalStorageService.get("locale");

    $scope.$on('balances.notReady', function() {
        $scope.balances_ready = false;
    });
    $scope.$on('balances.ready', function() {
        $scope.balances_ready = true;
        LoaderService.hide();
    });
    $scope.$on('newEntries', function(event) {
        console.log("en / new data from server");
        setTimeout(function() { console.log("delayed initing group"); $scope.initGroup(true); }, 500);
    });

    $scope.$on('$ionicView.loaded', function(event) {
        console.error("loading view");
        $scope.initGroup();
    });


    

    $scope.showIconTip = function(expense) {

        if(expense.GroupsUserId == $scope.currentUserGuid) {
            var msg = gettextCatalog.getString('This icon indicates that <strong>you paid</strong> for this expense.');
            var css_class = "paid_by_me";
        }
        else if (expense.current_user_in_expense) {
            var msg = gettextCatalog.getString('This icon indicates that <strong>you are included</strong> in this expense.');
            var css_class = "includes_me";
        }

        else {
            var msg = gettextCatalog.getString('This icon indicates that <strong>you did not pay nor are included</strong> in this expense.');
            var css_class = "";
        }

        var alertPopup = $ionicPopup.alert({
            cssClass : 'expenseIconTip',
            title: gettextCatalog.getString('What is that icon?'),
            template: '<i class="ion-android-list expense_icon ' + css_class + '"></i>' + msg
        });

    }

    $scope.goSettings = function() {
        $location.path('app/editgroup/' + $scope.GroupId);
    };

    $scope.addExpense = function() {
        $location.path('app/addexpense/' + $scope.GroupId);
    };

    $scope.editExpense = function(EntryId) {
        $location.path('app/editexpense/' + $scope.GroupId + '/' + EntryId);
    }


    $scope.getGroupData = function(callback) {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group_data = data[0];
            
            $scope.group_data.currency_symbol = (typeof(CURRENCIES_SYMBOLS[$scope.group_data.currency])!=='undefined') ? CURRENCIES_SYMBOLS[$scope.group_data.currency] : $scope.group_data.currency;
            $scope.$apply();
            if(callback) callback();
        });
    };

    var limit_display = 0;
    var max_display = 15;
    $scope.noMoreItems = false;

    $scope.showBalance = function(e) {

        $ionicTabsDelegate.select(1);

        if(!$scope.balances_ready) {
            LoaderService.show();
        }
    };

    $scope.getEntries = function(callback) {

        getBeneficiaries = function(entry_data) {
            EntriesModel.get_beneficiaries(entry_data.EntryId, function(data) {
                var current_user_in_expense = false;
                for(var i in data) {
                    if(data[i].GroupsUserId==$scope.currentUserGuid) {
                        entry_data.shared_amount = data[i].shared_amount;
                        current_user_in_expense = true;
                    }
                    entry_data.current_user_in_expense = current_user_in_expense;

                }
                $scope.expenses.push(entry_data);
            });
        };
        EntriesModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.expenses = [];
            for(var i in data)
                getBeneficiaries(data[i]);
            if(callback) callback();
        }, $scope.currentUserGuid);
    };

    $scope.getBalance = function(callback) {

        $scope.$broadcast('balances.notReady');

        if(!$rootScope.cached_balances)
            $rootScope.cached_balances = [];

        if(!$rootScope.cached_balances['group'+$scope.GroupId]) {

            console.log('cached balances not found');
            EntriesModel.calculateBalance($scope.GroupsUserIds, function(balances) {
                $scope.balances = balances;
                $rootScope.cached_balances['group'+$scope.GroupId] = true;
                console.log('balances have been cached');
                $scope.settled = ($scope.expenses.length>0 && objectLength($scope.balances)===0);
                $scope.$broadcast('balances.ready');
                if(callback) callback();
            });
        }
        
        else {
            console.log('cached balances found');
            //$scope.balances = $rootScope.cached_balances['group'+$scope.GroupId];
            //$scope.settled = ($scope.expenses.length>0 && objectLength($scope.balances)==0);
            $scope.$broadcast('balances.ready');
            if(callback) callback();
        }
    };
    
    $scope.getMembersNames = function(callback) {
        GroupsModel.get_members($scope.GroupId, function(members_names) {
            var group_data = [];
            members_names.map(function(arr) {
                if(arr.user_id == LocalStorageService.get("user_id")) {
                    $scope.currentUserGuid = arr.guid;
                }
                $scope.membersNames[arr.guid] = arr.username;
                group_data.push({'GroupsUserId':arr.guid});

            });
            $scope.GroupsUserIds = group_data;
            if(callback) callback();
        });
    };
    
    $scope.initGroup = function(discret) {

        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        $scope.getGroupData(function() {

            $scope.getMembersNames(function () {
                $scope.getEntries(function() {
                    $scope.$apply();
                    LoaderService.hide();
                    
                    $scope.getBalance();
                }, discret);
            });
        });
    };
    
    $scope.ShareGroup = function() {
        var text = gettextCatalog.getString('Accounts for group {{name}}', {name:$scope.group_data['name']});
        var url = 'http://www.debal.fr/' + $scope.group_data['public_key'];
        if(typeof window.plugins.socialsharing !== 'undefined') {
            window.plugins.socialsharing.share(text, null, null, url);
        }
    };
    $scope.openGroupUrl = function() {
        window.open('http://debal.fr/group/' + $scope.group_data['public_key'] + '/?locale=' + LocalStorageService.get("locale") + '&utm_source=app&utm_medium=balance&utm_campaign=outbound', '_system');
    };

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});