App
.controller('AddexpenseCtrl', function($scope, $state, $rootScope, $ionicPopup, $stateParams, $location, $ionicSideMenuDelegate, CURRENCIES_SYMBOLS, gettextCatalog, LoaderService, EntriesModel, GroupsModel) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.GroupId = $stateParams.GroupId;
    $scope.membersNames = [];
    $scope.shares_sum = 0;

    $scope.curr_action = 'add';
    $scope.curr_title = gettextCatalog.getString("Nouvelle dépense");


    var today_date = new Date();
    var today = today_date.getFullYear() + "-" + ("0" + (today_date.getMonth() + 1)).slice(-2) + "-" + ("0" + today_date.getDate()).slice(-2);
    $scope.expense = {'date':today};
    
    $scope.$on('newGroups', function(event) {
        console.log("en / new data from server");
        console.log("NEW GROUP DETECTED GETTING GROUP ID");
        $scope.initGroup(true);
    });

    $scope.selectAll = function(event) {
        var select_state = $scope.groupMembers[0].selected;
        for(var i = 0; i < $scope.groupMembers.length; i++) {
            var old_select_state = $scope.groupMembers[i].selected;
            $scope.groupMembers[i].selected = !select_state;
            if(old_select_state!=$scope.groupMembers[i].selected)
                $scope.changeState($scope.groupMembers[i]);
        }


        $scope.calculateShares();
    };

    $scope.validForm = function() {
        if (typeof($scope.expense.spender)=='undefined') {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Erreur'),
                template: gettextCatalog.getString("Préciser le nom du payeur.")
            });
        }
        else if(!is_amount($scope.expense.amount)) {
            var alertPopup = $ionicPopup.alert({
                title: gettextCatalog.getString('Erreur de montant'),
                template: gettextCatalog.getString("Le montant ne peut contenir que des chiffres et un point (pas de virgule !)")
            });
            alertPopup.then(function(res) {
                document.getElementById("amount_field").focus();
            });
        }
        else if ($scope.shares_sum==0) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Erreur'),
                template: gettextCatalog.getString("Veuillez entrer au moins un bénéficiaire.")
            });
        }
        else
            $scope.addExpense();
    };

    $scope.addShare = function(member) {
        var oldval = parseFloat(member.share);

        if(oldval===0.5) 
            member.share = 1;
        else if(oldval<10)
            member.share = oldval + 0.5;

        $scope.shares_sum -= oldval;
        $scope.shares_sum += member.share;

        if(member.selected!==true) {
            member.selected = true;
            $scope.changeState(member);
        }

        $scope.calculateShares();
    };

    $scope.removeShare = function(member) {
        var oldval = parseFloat(member.share);
        if(oldval<=0.5) {
            member.share = 0;
            member.selected = false;
        } 
            
        else 
            member.share = oldval - 0.5;

        $scope.shares_sum -= oldval;
        $scope.shares_sum += member.share;

        $scope.calculateShares();
    };
    $scope.changeState = function(member) {
        if(member.selected===true) {
            member.share = member.default_share;
            $scope.shares_sum += member.share;
        }
        else {
            $scope.shares_sum -= member.share;
            member.share = 0;
            member.sharedAmount = 0;
        }
        $scope.calculateShares();
    };
    $scope.calculateShares = function() {
        if($scope.expense.amount===undefined)
            $scope.expense.amount = 0;

        for(var i in $scope.groupMembers) {
            var member = $scope.groupMembers[i];
            if(member.selected===true)
                $scope.groupMembers[i].sharedAmount = ($scope.groupMembers[i].share*$scope.expense.amount/$scope.shares_sum).toFixed(2);
            else
                $scope.groupMembers[i].sharedAmount = 0;
        }

        if($scope.expense.amount===0)
            $scope.expense.amount = null;
    }
    
    $scope.addExpense = function() {

        LoaderService.show();

        // Block Sync While processing
        $rootScope.$broadcast('blockSync');

        var expense = $scope.expense;

        if(expense.title===undefined)
            expense.title = '';

        var beneficiaries = [];

        for(var i in $scope.groupMembers) {
            var arr = $scope.groupMembers[i];

            if(expense.spender == arr.guid)
                var spender_server_guid = arr.id;

            if(arr.selected===true)
                beneficiaries.push({
                    GroupsUserId: arr.guid, 
                    share: arr.share, 
                    shared_amount: arr.sharedAmount,
                    groups_user_id: (arr.id!==undefined) ? arr.id : null,
                });
        }
        

        data = {
            GroupId: $scope.GroupId,
            GroupsUserId: expense.spender,
            amount: expense.amount,
            title: expense.title,
            date: expense.date,
            group_id: ($scope.group.id!==undefined) ? $scope.group.id : null,
            groups_user_id: (spender_server_guid!==undefined) ? spender_server_guid : null,
        };

        

        EntriesModel.create(data, function(created_expense_id) {

            if(created_expense_id!==undefined) {
                EntriesModel.create_beneficiaries(beneficiaries, function() {
                    if($rootScope.cached_balances && ($rootScope.cached_balances['group'+$scope.GroupId])) {
                        console.log("// Remove cached entries !!");
                        //var index = $rootScope.cached_balances.indexOf('group'+$scope.GroupId);
                        delete $rootScope.cached_balances['group'+$scope.GroupId]
                        delete $rootScope.cached_entries['group'+$scope.GroupId]
                    }
                    LoaderService.hide();

                    // unBlock Sync after processing
                    $rootScope.$broadcast('unblockSync');


                    $location.path('app/groupexpenses/'+$scope.GroupId);
                    $scope.$apply();
                }, created_expense_id);
            }
            
        });
        
    };
    
    $scope.getMembers = function() {
        GroupsModel.get_members_sharenotzero($scope.GroupId, function(members_names) {
            var shares_sum = 0;
            for (var i in members_names) {
                members_names[i].share = 0;
                members_names[i].sharedAmount = 0;

                /* TODO
                if($scope.membersNames.indexOf(members_names[i].username)>0) {
                    console.log("fOUND" + members_names[i].email.length);
                    if(members_names[i].email.length>0)
                        $scope.membersNames[members_names[i].guid] = members_names[i].username + "(" + members_names[i].email + ")";
                    else
                        $scope.membersNames[members_names[i].guid] = members_names[i].username + "(" + i + ")";

                }
                else
                    $scope.membersNames[members_names[i].guid] = members_names[i].username;
                */
                $scope.membersNames[members_names[i].guid] = members_names[i].username;
            }

            $scope.groupMembers = members_names;
            $scope.shares_sum = 0;
            console.log($scope.groupMembers);
            $scope.selectAll();
            $scope.$apply();
        });
    };

    $scope.initGroup = function() {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group = data[0];
            $scope.currency_symbol = (typeof(CURRENCIES_SYMBOLS[$scope.group.currency])!='undefined') ? CURRENCIES_SYMBOLS[$scope.group.currency] : $scope.group.currency;
            $scope.getMembers();
        });
    }

    $scope.initGroup();




    $scope.tel_keyboard = false;

    var device = ionic.Platform.device();

    if(typeof(device.model)!='undefined') {
        if (device.model=="GT-I9300" || device.model=="GT-P5210" || device.model=="C5303" || device.model == "GT-I9195" || device.model == "GT-I9500" || device.model == "GT-I9505" || device.model == "GT-I9506")
            $scope.tel_keyboard = true;
    }

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});