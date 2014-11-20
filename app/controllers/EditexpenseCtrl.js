App
.controller('EditexpenseCtrl', function($scope, $state, $rootScope, $stateParams, $ionicPopup, $location, $ionicSideMenuDelegate, CURRENCIES_SYMBOLS, gettextCatalog, LoaderService, EntriesModel, GroupsModel) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.GroupId = $stateParams.GroupId;
    $scope.EntryId = $stateParams.EntryId;
    $scope.expense = [];
    $scope.membersNames = [];
    $scope.shares_sum = 0;

    $scope.curr_action = 'edit';
    $scope.curr_title = gettextCatalog.getString("Modifier la dépense");

    $scope.$on('newEntries', function(event) {
        console.log("en / new data from server");
        console.log("NEW ENTRY DETECTED GETTING ENTRY ID");
        $scope.getEntry();
    });
    $scope.$on('newGroups', function(event) {
        console.log("en / new data from server");
        console.log("NEW GROUP DETECTED GETTING GROUP ID");
        $scope.initGroup();
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
            $scope.editExpense();
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
            member.share = (member.share==0) ? (member.default_share==0) ? 0.5 : member.default_share : member.share;
            $scope.shares_sum += member.share;
        }
        else {
            $scope.shares_sum -= member.share;
            member.share = 0;
            member.sharedAmount = 0;
        }
        $scope.calculateShares();
    }
    $scope.calculateShares = function() {
        if($scope.expense.amount===undefined)
            $scope.expense.amount = 0;

        for(var i in $scope.groupMembers) {
            var member = $scope.groupMembers[i];
            if(member.selected===true)
                $scope.groupMembers[i].sharedAmount = ($scope.groupMembers[i].share*$scope.expense.amount/$scope.shares_sum).toFixed(2);
            else {
                $scope.groupMembers[i].sharedAmount = 0;
                $scope.groupMembers[i].share = 0;
            }
        }

        if($scope.expense.amount===0)
            $scope.expense.amount = null;
    }
    
    $scope.editExpense = function() {

        LoaderService.show();

        // Block Sync While processing
        $rootScope.$broadcast('blockSync');

        var expense = $scope.expense;

        if(expense.title===undefined) {
            expense.title = '';
        }
        
        var beneficiaries = [];

        for(var i in $scope.groupMembers) {
            var arr = $scope.groupMembers[i];

            if(expense.spender == arr.guid)
                var spender_server_guid = arr.id;

            if(arr.selected===true)
                beneficiaries.push({
                    'EntryId':$scope.EntryId,
                    'GroupsUserId':arr.guid,
                    'share':arr.share,
                    'shared_amount':arr.sharedAmount,
                    'entry_id': ($scope.expense.id!==undefined) ? $scope.expense.id : null,
                    'groups_user_id': (arr.id!==undefined) ? arr.id : null,
                    //'id': (arr.id!==undefined) ? arr.id : null,
                });
        };
        data = {
            GroupId: $scope.GroupId,
            GroupsUserId: expense.spender,
            groups_user_id: (spender_server_guid!==undefined) ? spender_server_guid : null,
            amount: expense.amount,
            title: expense.title,
            date: expense.date,
        };

        

        EntriesModel.update(data, $scope.EntryId, function() {

            EntriesModel.update_beneficiaries(beneficiaries, function() {

                if($rootScope.cached_balances && ($rootScope.cached_balances['group'+$scope.GroupId])) {
                    console.log("// Remove cached entries !!");
                    //var index = $rootScope.cached_balances.indexOf('group'+$scope.GroupId);
                    delete $rootScope.cached_balances['group'+$scope.GroupId]
                    delete $rootScope.cached_entries['group'+$scope.GroupId]
                }
                // unBlock Sync after processing
                $rootScope.$broadcast('unblockSync');


                LoaderService.hide();
                $location.path('app/groupexpenses/'+$scope.GroupId);
                $scope.$apply();
            })
            
        });
    };


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
                        //var index = $rootScope.cached_balances.indexOf('group'+$scope.GroupId);
                        delete $rootScope.cached_balances['group'+$scope.GroupId]
                        delete $rootScope.cached_entries['group'+$scope.GroupId]
                    }
                    $location.path('app/groupexpenses/'+$scope.GroupId);
                    $scope.$apply();
                });
            }
        });
    };

    $scope.getMembers = function(callback) {
        GroupsModel.get_members($scope.GroupId, function(members_names) {
            members_names.shares_sum = 0;
            $scope.groupMembers = members_names;
            $scope.$apply();
            callback();
        });
    }

    $scope.getEntry = function() {
        EntriesModel.read({EntryId: $scope.EntryId}, function(entry) {

            $scope.expense = angular.copy(entry[0]);
            $scope.expense.spender = entry[0]['GroupsUserId'];
            
            $scope.$apply();

            EntriesModel.get_beneficiaries($scope.EntryId, function(beneficiaries) {

                for(var i in $scope.groupMembers) {

                    $scope.groupMembers[i].visible = (($scope.groupMembers[i].default_share>0) || ($scope.groupMembers[i].share>0) || ($scope.groupMembers[i].guid == $scope.expense.spender));

                    var curr_member = $scope.groupMembers[i];

                    if(typeof curr_member === 'object') {
                        $scope.membersNames[curr_member.guid] = curr_member.username;

                        for(var k in beneficiaries) {
                            if(beneficiaries[k]['GroupsUserId']==curr_member['guid']) {

                                $scope.groupMembers[i].selected = true;
                                $scope.groupMembers[i].share = beneficiaries[k]['share'];
                                $scope.groupMembers[i].sharedAmount = beneficiaries[k]['shared_amount'];
                                $scope.groupMembers[i].default_share = curr_member.default_share;
                                
                                $scope.changeState($scope.groupMembers[i]);
                            }
                        }

                    }
                    $scope.$apply();
                }
                
            });
            


        });
    }

    $scope.initGroup = function() {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group = data[0];
            $scope.currency_symbol = (typeof(CURRENCIES_SYMBOLS[$scope.group.currency])!='undefined') ? CURRENCIES_SYMBOLS[$scope.group.currency] : $scope.group.currency;
            $scope.getMembers($scope.getEntry);

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