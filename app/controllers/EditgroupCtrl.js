App
.controller('EditgroupCtrl', function($scope, $rootScope, $state, $location, $ionicPopup, $ionicPopover, $stateParams, $ionicSideMenuDelegate, $ionicTabsDelegate, $ionicScrollDelegate, gettextCatalog, LoaderService, LocalStorageService, CURRENCIES_LIST, UsersModel, GroupsModel, EntriesModel) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.GroupId = $stateParams.GroupId;
    $scope.currencies = CURRENCIES_LIST;
    $scope.current_user = {'id':LocalStorageService.get("user_id"), 'current_user':true, 'username':LocalStorageService.get("user_name"), 'email':LocalStorageService.get("user_email")};

    $ionicPopover.fromTemplateUrl('app/templates/editgroup_useroptions.html', {
        scope: $scope,
    })
    .then(function(popover) {
        $scope.popover = popover;
    });

    $scope.$on('newGroups', function(event) {
        console.log("en / new data from server");
        $scope.initGroup(true);
    });

    var locale = LocalStorageService.get('locale');
    
    $scope.locale = (typeof CURRENCIES_LIST["EUR"]["name_" + locale] != 'undefined') ? locale : 'en';

    var tab_text1 = gettextCatalog.getString('Participants');
    var tab_text2 = gettextCatalog.getString('Réglages');
    $scope.tab_title = tab_text1
    $scope.tab_index = 0;

    $scope.selectTab = function() {
        $scope.tab_index = $ionicTabsDelegate.selectedIndex();
        
        if($ionicTabsDelegate.selectedIndex()==0) 
            $scope.tab_title = tab_text1;
        else
            $scope.tab_title = tab_text2;
    }

    $scope.openPopover = function($event, member, index) {
        $scope.popover.member = angular.copy(member);
        $scope.popover.checkName = checkName;
        $scope.popover.member.index = index;
        $scope.popover.group_id = angular.copy($scope.group.id);
        $scope.popover.show($event);   
    };
    $scope.$on('popover.hidden', function(event) {
        if(typeof($scope.popover.member)!='undefined') {
            $scope.group.members[$scope.popover.member.index] = $scope.popover.member;
        }
    })

    $scope.$on('$destroy', function() {
        $scope.popover.remove();
    });

    function checkName(name) {
        for (var i in $scope.group.members) {
            if($scope.group.members[i].username.toLowerCase()==name.toLowerCase())
                return false;
        }
        return true;
    }

    $scope.addMember = function() {
        $scope.data = {}

        var myPopup = $ionicPopup.show({
            template: '<input autofocus placeholder="' + gettextCatalog.getString('Entrer un nom') + '" type="text" class="add-user-input" ng-model="data.username">',
            title: gettextCatalog.getString('Ajouter un membre'),

            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Annuler') },
                {
                    text: '<b>' + gettextCatalog.getString('Ajouter') + '</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        if (!$scope.data.username)
                            e.preventDefault();
                        else
                            return $scope.data.username;
                    }
                },
            ]
        });

        // Open keyboard
        if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
            cordova.plugins.Keyboard.show();

            myPopup.then(function(res) {

                // Close keyboard
                if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
                    cordova.plugins.Keyboard.close();

                if(res) {
                    if($scope.data.username && checkName($scope.data.username)) {

                        var user_data = {'username':$scope.data.username};
                        var group_data = {'GroupId':$scope.GroupId,'group_id' : (typeof($scope.group.id)!='undefined') ? $scope.group.id : null}

                        GroupsModel.create_groups_user(user_data, group_data, function(created_gu) {
                            if(typeof created_gu != 'undefined' && created_gu !== null) {
                                $scope.group.members.push({guid: created_gu.GroupsUserId, UserId:created_gu.UserId, username: $scope.data.username, share:1, deleted:0});
                                $ionicScrollDelegate.scrollBottom(true);
                            }
                        });
                    }

                    else if(!checkName($scope.data.username)) {
                        var alertPopup = $ionicPopup.alert({
                            title: gettextCatalog.getString('Erreur'),
                            template: gettextCatalog.getString("Veuillez renseigner un nom qui n'est pas déjà utilisé !")
                        });
                        alertPopup.then(function(res) {
                            $scope.addMember();
                        });
                    }
                }
            });
    };

    $scope.validForm = function(callback) {
        if(typeof($scope.group.name)=='undefined') {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Erreur'),
                template: gettextCatalog.getString("Veuillez renseigner un nom pour le groupe !")
            });
            callback(false);
        }
        else if($scope.group.members.length<2) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Erreur'),
                template: gettextCatalog.getString("Veuillez ajouter au minimum une deuxième personne au groupe !")
            });
            callback(false);
        }
        else
            callback(true);
    }

    //var group_members = [];

    $scope.editGroup = function() {
        $scope.validForm(function(validated) {
            if(validated) {
                var group = {'GroupId':$scope.GroupId, 'name':$scope.group.name,'currency':$scope.group.currency.id};
                LocalStorageService.set('currency', $scope.group.currency.id);
                // Update group 
                GroupsModel.update(group, function() {
                    $location.path('app/groupexpenses/' + $scope.GroupId);
                    $scope.$apply();
                })
            }
        })
    };

    $scope.deleteGroup = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Confirmez la suppression'),
            template: gettextCatalog.getString('Ce groupe et toutes ses dépenses seront définitivement supprimées. Cela affectera tous les membres connectés à ce groupe.'),
            buttons: [
                { text: gettextCatalog.getString('Annuler'), onTap: function(e) { return false; } },
                { text: '<b>' + gettextCatalog.getString('Confirmer') + '</b>', type: 'button-positive', onTap: function(e) { return true; } },
            ]
        });
        
        confirmPopup.then(function(res) {
            if(res) {
                GroupsModel.delete($scope.GroupId, function() {
                    var alertPopup = $ionicPopup.alert({
                        title: gettextCatalog.getString('Groupe supprimé'),
                        template: gettextCatalog.getString('Le groupe a bien été supprimé.')
                    });
                    alertPopup.then(function(res) {
                        $state.go('app.groups');
                    });
                });
            }
        });
    };

    $scope.getGroup = function(discret) {

        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        GroupsModel.read({GroupId: $scope.GroupId}, function(r) {

            $scope.group = {
                'UserId':r[0].UserId,
                'GroupId':$scope.GroupId,
                'currency':$scope.currencies[r[0].currency],
                'id':r[0].id,
                'name':r[0].name
            };

            CountEntries = function(member) {
                EntriesModel.count_user_entries(member.guid, function(r) {
                    member.count_total = r;
                })
            }

            GroupsModel.get_members($scope.GroupId, function (s) {
                $scope.group.members = s;
                var zero_share_members = [];
                for(var i in $scope.group.members) {
                    
                    CountEntries($scope.group.members[i]);
                    
                    $scope.group.members[i].share = $scope.group.members[i].default_share;

                    // Current User
                    if($scope.group.members[i].UserId==$scope.current_user.UserId) {
                        $scope.group.members[i].current_user = true;
                        var current_user_key = i;
                    }

                    else
                        $scope.group.members[i].registered = (typeof($scope.group.members[i].email)!=='undefined' && $scope.group.members[i].email != "" && $scope.group.members[i].email!=null && $scope.group.members[i].email!='null');

                    $scope.group.members[i].deleted = 0

                    if($scope.group.members[i].default_share==0)
                        zero_share_members.push(i);
                    
                    if($scope.group.members[i].default_share!="1")
                        $scope.group.shares = true;

                    $scope.group.members[i].invited = (validateEmail($scope.group.members[i].invite_email));

                    if(i==$scope.group.members.length-1) {
                        LoaderService.hide();
                        console.log($scope.group.members);
                    }
                }

                
               // if(!discret) {
                    // Rearrange array : current user on top, deleted user at bottom
                    $scope.group.members.sort(function(a, b) {
                        if(a.current_user)
                            return -1;
                        else if (b.current_user)
                            return 1;
                        else if(a.default_share==0 && b.default_share!=0)
                            return 1;
                        else if (a.default_share!=0 && b.default_share==0)
                            return -1
                        else {
                            var textA = a.username.toUpperCase();
                            var textB = b.username.toUpperCase();
                            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                        }
                    });
              //  }
                
            })
        });
    }

    $scope.initGroup = function(discret) {
        // Retrieve UserId
        UsersModel.getUserId($scope.current_user.id, function(r) {
            $scope.current_user.UserId = r[0].UserId;
        });

        $scope.getGroup(discret);
    }

    $scope.initGroup();

    

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);
});