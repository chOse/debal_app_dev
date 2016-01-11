/* global App */

App
.controller('SaveExpenseCtrl', function($scope, $state, $rootScope, $ionicModal, $ionicPopup, $filter, $timeout, $stateParams, $ionicSlideBoxDelegate, $ionicLoading, gettextCatalog, LocalStorageService, EntriesModel) {

    if($state.current.name==='app.group.editexpense') {
        $scope.EntryId = $stateParams.EntryId;
        $scope.curr_action = 'edit';
        $scope.curr_title = gettextCatalog.getString("Edit expense");
    }
    else {
        $scope.curr_action = 'add';
        $scope.curr_title = gettextCatalog.getString("New expense");
    }

    $scope.$on('newEntries', function(event) {  // If entries were updated, entry may have changed
        $scope.initEntry();
    });

    $scope.$on('$ionicView.beforeEnter', function(event) {
        $scope.initEntry();
    });

    $scope.$watch('curr_title', function() {
        console.error("curr title changed");
    })

    $scope.initEntry = function() {
        $scope.getEntryMembers(function() {
            $scope.getEntry(function() {
                if($state.current.name==='app.group.addexpense') {
                    $scope.select_state = false;
                    $scope.selectAll();

                }
            });
        });
    };

    $scope.toggleButtons = function(member) {
        member.showShareButtons = !member.showShareButtons;
    }

    // Slide page management
    $scope.data = {};    
    // Common functions for form controls
    $scope.$watch('data.slider', function(e) {
        $scope.data.slider = e;
    });
    $scope.nextSlide = function() {
        $scope.data.slider.slideNext();
        $scope.data.showInfoMessage = true;
        $timeout(function() { $scope.data.showInfoMessage = false; }, 5000);
    };
    $scope.previousSlide = function() {
        $scope.data.slider.slidePrev();
    };

    $scope.select_state = false;

    $scope.selectAll = function() {

        $scope.select_state = !$scope.select_state;

        for(var i = 0; i < $scope.entryMembers.length; i++) {
            $scope.changeState($scope.entryMembers[i], $scope.select_state);
        } 
        $scope.calculateShares();
    };

    $scope.validForm = function() {
        if (!$scope.expense.spender || !$scope.expense.spender.GroupsUserId) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please select spender.")
            });
        }
        else if(!is_amount($scope.expense.amount)) {
            var alertPopup = $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("The amount may only contain digits and a dot (no commas!)")
            });
            alertPopup.then(function(res) {
                document.getElementById("amount_field").focus();
            });
        }
        else if ($scope.shares_sum===0) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please select at least one beneficiary.")
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

        $scope.calculateShares();
    };

    $scope.removeShare = function(member) {
        var oldval = parseFloat(member.share);

        if(oldval<=0.5)
            return $scope.changeState(member, false);
            
        else
            member.share = oldval - 0.5;

        $scope.calculateShares();
    };

    $scope.changeState = function(member, value, callback) {
        var old_state = member.selected ? member.selected : false;
        member.selected = (typeof value !== 'undefined') ? value : old_state;
        if(old_state!==value) {
            if(member.selected===true) {
                if(member.share===0)
                    member.share = member.default_share;
            }

            else {
                member.share = 0;
                member.sharedAmount = 0;
            }
        }
        $scope.calculateShares();
    };


    $scope.calculateShares = function() {
        if($scope.expense.amount==="undefined" || $scope.expense.amount===null)
            $scope.expense.amount = 0;
        $scope.shares_sum = 0;

        for(var j in $scope.entryMembers) {
            var member = $scope.entryMembers[j];
            if(member.selected===true)
                $scope.shares_sum += member.share;
        }
        for(var i in $scope.entryMembers) {
            var member = $scope.entryMembers[i];
            if(member.selected===true)
                $scope.entryMembers[i].sharedAmount = ($scope.entryMembers[i].share*$scope.expense.amount/$scope.shares_sum).toFixed(2);
            else
                $scope.entryMembers[i].sharedAmount = 0;
        }

        if($scope.expense.amount===0)
            $scope.expense.amount = null;
    };

   

    // Save expense

    $scope.saveExpense = function() {

        $ionicLoading.show();

        $scope.calculateShares();

        // Block Sync While processing
        $rootScope.$broadcast('blockSync');

        var expense = $scope.expense;

        if(expense.title===undefined)
            expense.title = '';

        var beneficiaries = [];

        for(var i in $scope.entryMembers) {
            var entryMember = $scope.entryMembers[i];

            // Beneficiaries Array
            if(entryMember.selected===true)
                beneficiaries.push({
                    EntryId: ($scope.EntryId!==undefined) ? $scope.EntryId : null,
                    entry_id: ($scope.expense.id!==undefined) ? $scope.expense.id : null,
                    GroupsUserId: entryMember.GroupsUserId,
                    groups_user_id: entryMember.groups_user_id,
                    share: entryMember.share,
                    shared_amount: entryMember.sharedAmount
                });
        }

        // Expense Array
        data = {
            EntryId: ($scope.EntryId!==undefined) ? $scope.EntryId : null,
            GroupId: $scope.GroupId,
            group_id: ($scope.group.id!==undefined) ? $scope.group.id : null,
            GroupsUserId: expense.spender.GroupsUserId,
            groups_user_id: expense.spender.groups_user_id,
            amount: expense.amount*1,
            title: expense.title,
            category_id: (expense.category_id!==undefined) ? expense.category_id : null,
            date: $filter('date')(expense.date, "yyyy-MM-dd")
        };

        // Save or edit ?
        var add_function = EntriesModel.save_entry;
        if(typeof data.EntryId !== 'undefined' && data.EntryId !== null)
            add_function = EntriesModel.update_entry;
        

        add_function(data, beneficiaries, 
            function(entry_id) {
                if(typeof entry_id !== 'undefined' && !isNaN(entry_id)) {
                    $ionicLoading.hide();

                    // unBlock Sync after processing
                    $rootScope.$broadcast('unblockSync');

                    $scope.$apply(function() {
                        $state.go('app.group.tabs.expenses', {GroupId:$scope.group.GroupId});
                    });

                    $scope.getEntriesAndBalance();

                }
                
                else
                    console.error("Expense could not be added");
                
            });
    };

    // Edit - Delete expense
    $scope.deleteExpense = function() {
       
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Confirm'),
            template: gettextCatalog.getString('Are you sure you want to delete this expense?'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: gettextCatalog.getString('Confirm'), type: 'button-calm', onTap: function(e) { return true; } }
            ]
        });
        
        confirmPopup.then(function(res) {
            if(res) {
                EntriesModel.delete($scope.EntryId, function() {
                    $state.go('app.group.tabs.expenses', {GroupId:$scope.group.GroupId});
                    $scope.getEntriesAndBalance();
                });
            }
        });
    };


    $scope.getEntry = function(callback) {
        if(!$scope.shares_sum)
            $scope.shares_sum = 0;

        if($state.current.name==='app.group.editexpense') {

            EntriesModel.read({EntryId: $scope.EntryId}, function(entry) {

                $scope.expense = angular.copy(entry[0]);
                $scope.expense.date = new Date(entry[0].date);

                EntriesModel.get_beneficiaries($scope.EntryId, function(beneficiaries) {

                    var entry_members = angular.copy($scope.entryMembers);

                    for(var i in entry_members) {

                        var curr_member = entry_members[i];
                        if(curr_member.GroupsUserId===$scope.expense.GroupsUserId)                        
                            $scope.expense.spender = curr_member;

                        curr_member.visible = ((curr_member.default_share>0) || (curr_member.share>0) || (curr_member.GroupsUserId === $scope.expense.GroupsUserId));

                        if(typeof curr_member === 'object') {
                            for(var k in beneficiaries) {
                                if(beneficiaries[k].GroupsUserId===curr_member.GroupsUserId) {
                                    curr_member.share = beneficiaries[k].share;
                                    $scope.changeState(curr_member, true, true);
                                    curr_member.sharedAmount = beneficiaries[k].shared_amount;
                                }
                            }
                        }
                        if(i*1===objectLength(entry_members)-1) {
                            $scope.entryMembers = entry_members;
                            $scope.calculateShares();
                            $scope.$apply();
                            if(callback)
                                callback();
                        }
                    }
                });
            });
        }
        else {
            if(!$scope.expense) {
                console.error("reset entry");
                $scope.expense = {amount:0, date: new Date()};
            }
            if(callback)
                callback();
        }
    };

    $scope.getEntryMembers = function(callback) {
        var entry_members =  [];

        for (var i in $scope.group.members) {

            var entry_member = angular.copy($scope.group.members[i]);
            entry_member.share = 0;
            entry_member.sharedAmount = 0;

            if($state.current.name==='app.group.addexpense') {
                if(entry_member.default_share!==0) // Dont display members with default_share = 0 when new expense
                    entry_members.push(entry_member);
            }

            else if($state.current.name==='app.group.editexpense')
                entry_members.push(entry_member);
        }
        
        if(!$scope.entryMembers) {
            console.error("reset entry members");
            $scope.entryMembers = entry_members;
        }

        if(callback) callback();
    };

    // Categories Modal
    $ionicModal.fromTemplateUrl('app/templates/addexpense_categories_modal.html', {
        scope: $scope,
        focusFirstInput: true,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modal = modal;
    });

    $scope.openCategories = function() {
        $scope.modal.show();
        if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
            cordova.plugins.Keyboard.close();
    };

    $scope.closeCategories = function() {
        $scope.modal.hide();
    };

    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });

    $scope.selectCategory = function(category) {
        var c = angular.copy(category);
        $scope.expense.category_id = c.id;
        $scope.modal.hide();
    }

    $scope.tel_keyboard = false;

    var device = ionic.Platform.device();
    var devices_models_kb = ["SM-T530","SM-T111","SM-T110","SM-T311","SM-T310","SM-T315","KTU84L","SM-G900F","SM-G800F","GT-I9300","GT-P5210","C5303","GT-I9195","GT-I9500","GT-I9505","GT-I9506"];
    $scope.tel_keyboard = (LocalStorageService.get("setting_tel_keyboard")==="true" || (!LocalStorageService.get("setting_tel_keyboard") && typeof(device.model)!=='undefined' && devices_models_kb.indexOf(device.model)>-1));

    $scope.trackView();

});