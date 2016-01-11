App.controller('GroupCtrl',
    function($scope, $rootScope, $timeout, $stateParams, $state, $ionicPopup, $ionicNavBarDelegate, $ionicSideMenuDelegate, $ionicLoading, gettextCatalog, EntriesModel, GroupsModel, UsersModel, GroupsSecondCurrencyModel, CURRENCIES_LIST, LocalStorageService) {

    /* Init data */
    
    UsersModel.getUserId(LocalStorageService.get("user_id"), function(r) {
        $scope.current_user = {
            UserId: r[0].UserId,
            id: LocalStorageService.get("user_id"),
            username: LocalStorageService.get("user_name"),
            email: LocalStorageService.get("user_email")
        };
    });

    $scope.GroupId = $stateParams.GroupId;
    
    $scope.locale = LocalStorageService.get("locale");
    $scope.currencies = CURRENCIES_LIST;

    $ionicSideMenuDelegate.canDragContent(false);

    var tabs_index = ['app.group.tabs.expenses','app.group.tabs.balance','app.group.tabs.members','app.group.tabs.settings'];
    $scope.$on('$ionicView.beforeEnter', function(event) {
        $scope.tabSelectedIndex = tabs_index.indexOf($state.current.name);
    });
    /* End Init Data*/

    
    /* Listen to incoming Join group request*/
    $scope.$on('newJoinRequest', function(event) {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('New join request'),
            template: gettextCatalog.getString('You have received a request to join one of your groups.'),
            buttons: [
                { text: gettextCatalog.getString('Later') },
                {
                    text: gettextCatalog.getString('Check up'),
                    type: 'button-calm',
                    onTap: function(e) {
                        $state.go('app.groups');
                        $timeout(function() {$rootScope.$broadcast('openJoinRequests'); }, 500);
                    }
                }
            ]
        });
    });

    /* Listen to incoming entries or groups and reload group */
    $scope.$on('newEntries', function(event) {
       setTimeout(function() { console.error("delayed initing group"); $scope.initGroup(true); }, 500);
    });

    $scope.changeTab = function(index) {
        $scope.tabSelectedIndex = index;
        $state.go(tabs_index[index]);
    };

    $scope.getGroupData = function(callback) {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            var group_data = angular.copy(data[0]);
            
            $scope.group = group_data;

            if ($state.current.name.substring(0,14) == "app.group.tabs")
                $ionicNavBarDelegate.title($scope.group.name);

            $scope.initCurrencies();
            if(callback) callback();
        });
    };

    $scope.getMembers = function(callback) {

        CountEntries = function(member) {
            EntriesModel.count_user_entries(member.GroupsUserId, function(r) {
                member.count_total = r;
            });
        };

        // Rearrange array : current user on top, deleted user at bottom
        SortMembersList = function(members) {
            members.sort(function(a, b) {
                if(a.current_user)
                    return -1;
                else if (b.current_user)
                    return 1;
                else if(a.default_share*1===0 && b.default_share*1!==0)
                    return 1;
                else if (a.default_share*1!==0 && b.default_share*1===0)
                    return -1;
                else {
                    var textA = a.username.toUpperCase();
                    var textB = b.username.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                }
            });
        };

        GroupsModel.get_members($scope.GroupId, function(members) {
            var temp_members_names = [];
            $scope.members_count = 0;

            for(var i in members) {

                var member = members[i];

                if(member.display_name !== null && member.display_name.length!=0) {
                    member.username = member.display_name;
                }

                delete member.display_name;

                if(member.user_id == LocalStorageService.get("user_id")) {
                    $scope.currentUserGuid = member.GroupsUserId;
                }

                if(member.default_share*1!==0 && member.deleted*1!==0)
                    $scope.members_count++;

                temp_members_names[member.GroupsUserId] = member.username; // Array of usernames indexed by GroupsUserIds

                CountEntries(member);
            
                member.share = member.default_share;
                member.registered = (validateEmail(member.email));
                member.deleted = 0;
                member.invited = (validateEmail(member.invite_email));

                // Current User
                if(member.UserId==$scope.current_user.UserId) {
                    member.current_user = true;
                }

                if(i==members.length-1) { // End of Loop
                    SortMembersList(members);
                    $scope.group.members = members;
                    $scope.membersNames = temp_members_names;
                    if(callback) callback();
                }

            }
        });
    };

    $scope.getEntries = function(callback) {

        $scope.entries_count = 0;


        getBeneficiaries = function(data, j, callback) {
            
            var entry_data = data[j];

            EntriesModel.get_beneficiaries(entry_data.EntryId, function(data) {
                var current_user_in_expense = false;
                for(var i in data) {
                    if(data[i].GroupsUserId==$scope.currentUserGuid) {
                        entry_data.shared_amount = data[i].shared_amount;
                        current_user_in_expense = true;
                    }
                    entry_data.current_user_in_expense = current_user_in_expense;

                }

                callback(j, entry_data);

            });
        };
        EntriesModel.read({GroupId: $scope.GroupId}, function(data) {
            
            var expenses = [];

            for(var i in data) {
                $scope.entries_count += data[i].amount*1;
                getBeneficiaries(data, i, function(j, entry_data) {
                    
                    expenses.push(entry_data);

                    if(j*1===data.length-1) {// End of Loop {
                        $scope.expenses = expenses;
                    }
                });
            }
            if(callback) callback();
        }, $scope.currentUserGuid);

    };

    $scope.getBalance = function(callback) {
        EntriesModel.calculateBalance(angular.copy($scope.group.members), function(balances) {
            $scope.balances = balances;
            $scope.settled = (typeof $scope.expenses != 'undefined' && $scope.expenses.length>0 && objectLength($scope.balances)===0);
            
            if(callback) callback();
        });
    };

    $scope.initCurrencies = function() {
     
        $scope.group.currency = $scope.currencies[$scope.group.currency];
        $scope.group.currency.symbol = $scope.getCurrencySymbol($scope.group.currency.id);

        GroupsSecondCurrencyModel.read($scope.group.GroupId, function(data) {
            if(data.length>0) {
                $scope.group.secondary_currency = $scope.currencies[data[0].second_currency];
                $scope.group.secondary_currency.symbol = $scope.getCurrencySymbol(data[0].second_currency);
                $scope.group.currency_rate = data[0].rate;
            }
            else
                $scope.group.secondary_currency = {};

        });
    };

    $scope.getGroupAndMembers = function(callback) {
        $scope.getGroupData(function() {
            $scope.getMembers(callback);
        });
    };

    $scope.getEntriesAndBalance = function(callback) {
        $scope.getEntries(function() {
            $scope.getBalance(callback);
        });
    };


    $scope.initGroup = function(discret) {
        console.error("initing group! " + $state.current.name);

        if(!discret) $ionicLoading.show();

        $scope.categories = [];
        // Categories List
        GroupsModel.get_categories(function(data) {
            for(var i in data) {
                var cid = data[i].id;
                $scope.categories[cid] = data[i];
            }
        });
        
        $scope.getGroupAndMembers(function() {
            $scope.getEntriesAndBalance(function() {
                if(!discret) $ionicLoading.hide();
            });
        });
    };
    $scope.initGroup();

    
});