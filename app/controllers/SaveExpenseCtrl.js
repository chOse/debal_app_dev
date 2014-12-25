App
.controller('SaveExpenseCtrl', function($scope, $state, $rootScope, $ionicPopup, $stateParams, $location, $ionicSideMenuDelegate, $ionicSlideBoxDelegate, CURRENCIES_SYMBOLS, gettextCatalog, LoaderService, EntriesModel, GroupsModel) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.GroupId = $stateParams.GroupId;
    $scope.EntryId = $stateParams.EntryId;
    $scope.membersNames = [];
    $scope.shares_sum = 0;

    var today_date = new Date();
    var today = today_date.getFullYear() + "-" + ("0" + (today_date.getMonth() + 1)).slice(-2) + "-" + ("0" + today_date.getDate()).slice(-2);
    $scope.expense = {'date':today};

    if($state.current.name=='app.editexpense') {
        $scope.curr_action = 'edit';
        $scope.curr_title = gettextCatalog.getString("Modifier la dépense");
    }
    else {
        $scope.curr_action = 'add';
        $scope.curr_title = gettextCatalog.getString("Nouvelle dépense");
    }
    
    $scope.$on('newGroups', function(event) {
        console.log("en / new data from server");
        $scope.initGroup();
    });

    $scope.$on('newEntries', function(event) {
        if($state.current.name=='app.editexpense') {
            console.log("en / new data from server");
            $scope.getEntry();
        }
    });


    // Common functions for form controls

    $scope.nextSlide = function() {
        $ionicSlideBoxDelegate.next();
    }
    $scope.previousSlide = function() {
        $ionicSlideBoxDelegate.previous();
    }

    $scope.select_state = false;

    $scope.selectAll = function() {

        $scope.select_state = !$scope.select_state;

        for(var i = 0; i < $scope.groupMembers.length; i++) {
            $scope.changeState($scope.groupMembers[i], $scope.select_state);
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
            $scope.saveExpense();
    };

    $scope.addShare = function(member) {
        var oldval = parseFloat(member.share);

        if(member.selected!==true)
            return $scope.changeState(member, true);

        if(oldval===0.5) 
            member.share = 1;
        else if(oldval<10)
            member.share = oldval + 0.5;

        $scope.shares_sum -= oldval;
        $scope.shares_sum += member.share;

        $scope.calculateShares();
    };

    $scope.removeShare = function(member) {
        var oldval = parseFloat(member.share);

        if(oldval<=0.5)
            return $scope.changeState(member, false);
            
        else
            member.share = oldval - 0.5;
        
        $scope.shares_sum -= oldval;
        $scope.shares_sum += member.share;

        $scope.calculateShares();
    };

    $scope.changeState = function(member, value, init) {
        var old_state = member.selected ? member.selected : false;
        member.selected = (typeof value != 'undefined') ? value : old_state;

        if(old_state!==value) {
            if(member.selected===true) {
                if(member.share===0)
                    member.share = member.default_share;
                $scope.shares_sum += member.share;
            }

            else {
                $scope.shares_sum -= member.share;
                member.share = 0;
                member.sharedAmount = 0;
            }
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


    // Save expense

    $scope.saveExpense = function() {

        LoaderService.show();

        $scope.calculateShares();

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
                    EntryId: ($scope.EntryId!==undefined) ? $scope.EntryId : null,
                    entry_id: ($scope.expense.id!==undefined) ? $scope.expense.id : null,
                    GroupsUserId:arr.guid,
                    groups_user_id: (arr.id!==undefined) ? arr.id : null,
                    share:arr.share,
                    shared_amount:arr.sharedAmount
                });
        };
        data = {
            EntryId: ($scope.EntryId!==undefined) ? $scope.EntryId : null,
            GroupId: $scope.GroupId,
            group_id: ($scope.group.id!==undefined) ? $scope.group.id : null,
            GroupsUserId: expense.spender,
            groups_user_id: (spender_server_guid!==undefined) ? spender_server_guid : null,
            amount: expense.amount,
            title: expense.title,
            date: expense.date,
        };

        // Save or edit ?
        var add_function = EntriesModel.save_entry;
        if(typeof data.EntryId != 'undefined' && data.EntryId !== null)
            add_function = EntriesModel.update_entry;
        

        add_function(data, beneficiaries, 
            function(entry_id) {
                if(typeof entry_id != 'undefined' && !isNaN(entry_id)) {
                    if($rootScope.cached_balances && ($rootScope.cached_balances['group'+$scope.GroupId])) {
                        console.log("// Remove cached entries !!");
                        delete $rootScope.cached_balances['group'+$scope.GroupId]
                        delete $rootScope.cached_entries['group'+$scope.GroupId]
                    }
                    LoaderService.hide();

                    // unBlock Sync after processing
                    $rootScope.$broadcast('unblockSync');

                    $scope.$apply($location.path('app/groupexpenses/'+$scope.GroupId));
                }
                
                else
                    console.error("Expense could not be added");
                
            });
    };

    $scope.getMembers = function(callback) {
        var displayed_members =  [];

        GroupsModel.get_members($scope.GroupId, function(members_names) {

            for (var i in members_names) {
                members_names[i].share = 0;
                members_names[i].sharedAmount = 0;

                if($state.current.name=='app.addexpense') {
                    if(members_names[i].default_share!=0) {
                        
                        displayed_members.push(members_names[i]);
                        $scope.membersNames[members_names[i].guid] = members_names[i].username;
                    }

                }
                else if($state.current.name=='app.editexpense') {
                    displayed_members.push(members_names[i]);
                    $scope.membersNames[members_names[i].guid] = members_names[i].username;
                }
            }
            
            $scope.groupMembers = displayed_members;
            if($state.current.name=='app.addexpense') {
                $scope.select_state = false;
                $scope.selectAll();
            }

            $scope.$apply();

            if(callback) callback();
        });
    }


    // Edit - Delete expense

    $scope.deleteExpense = function() {
       
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Confirmez la suppression'),
            template: gettextCatalog.getString('Etes-vous sûr de vouloir supprimer cette dépense ?'),
            buttons: [
                { text: 'Annuler', onTap: function(e) { return false; } },
                { text: '<b>Confirmer</b>', type: 'button-positive', onTap: function(e) { return true; } },
            ]
        });
        
        confirmPopup.then(function(res) {
            if(res) {
                EntriesModel.delete($scope.EntryId, function() {
                    if($rootScope.cached_balances && ($rootScope.cached_balances['group'+$scope.GroupId])) {
                        console.log("// Remove cached entries !!");
                        delete $rootScope.cached_balances['group'+$scope.GroupId]
                        delete $rootScope.cached_entries['group'+$scope.GroupId]
                    }
                    $location.path('app/groupexpenses/'+$scope.GroupId);
                    $scope.$apply();
                });
            }
        });
    };


    $scope.getEntry = function() {

        if($state.current.name=='app.editexpense') {
            EntriesModel.read({EntryId: $scope.EntryId}, function(entry) {

                $scope.expense = angular.copy(entry[0]);
                $scope.expense.spender = entry[0]['GroupsUserId'];
                
                $scope.$apply();

                EntriesModel.get_beneficiaries($scope.EntryId, function(beneficiaries) {

                    for(var i in $scope.groupMembers) {

                        $scope.groupMembers[i].visible = (($scope.groupMembers[i].default_share>0) || ($scope.groupMembers[i].share>0) || ($scope.groupMembers[i].guid == $scope.expense.spender));

                        var curr_member = $scope.groupMembers[i];

                        if(typeof curr_member === 'object') {

                            for(var k in beneficiaries) {
                                if(beneficiaries[k]['GroupsUserId']==curr_member['guid']) {
                                    $scope.groupMembers[i].share = beneficiaries[k]['share'];
                                    $scope.changeState($scope.groupMembers[i], true, true);
                                    $scope.groupMembers[i].sharedAmount = beneficiaries[k]['shared_amount'];
                                }
                            }
                        }
                        $scope.$apply();
                    }
                });
            });
        }
    }

    // Init form
    $scope.initGroup = function() {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group = data[0];
            $scope.currency_symbol = (typeof(CURRENCIES_SYMBOLS[$scope.group.currency])!='undefined') ? CURRENCIES_SYMBOLS[$scope.group.currency] : $scope.group.currency;

            $scope.getMembers($scope.getEntry());
        });
    }

    $scope.initGroup();

    $scope.tel_keyboard = false;

    var device = ionic.Platform.device();

    if(typeof(device.model)!='undefined') {
        if (device.model=="SM-G900F" || device.model=="SM-G800F" || device.model=="GT-I9300" || device.model=="GT-P5210" || device.model=="C5303" || device.model == "GT-I9195" || device.model == "GT-I9500" || device.model == "GT-I9505" || device.model == "GT-I9506")
            $scope.tel_keyboard = true;
    }

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});