App.controller('GroupsCtrl', function($scope, $state, $location, $ionicSideMenuDelegate, gettextCatalog, GroupsModel, LocalStorageService, LoaderService) {

    $ionicSideMenuDelegate.canDragContent(true);
    
    $scope.groups = [];

    $scope.user_name = LocalStorageService.get("user_name");

    $scope.$on('newGroups', function(event) {
        $scope.getGroups(true);
    });

    $scope.goCreategroup = function() {
        $location.path('app/creategroup');
    }


    $scope.getGroups = function(discret) {
        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        getGroupMembers = function(group_data) {
            GroupsModel.get_members_sharenotzero(group_data.GroupId, function(data) {
                var members_list = "";
                var members = [];
                var connector1 = gettextCatalog.getString('with');
                var connector2 = gettextCatalog.getString('and');

                for(var i in data) {
                    members.push(data[i].username);
                }
                var last = members[members.length-1];
                members.pop();
                var members_list = connector1 + " " + members.join(", ");

                group_data.members_list = members_list + " " + connector2 + " " + last;
                $scope.groups.push(group_data);
                $scope.$apply();
            });
        };

        GroupsModel.read({}, function(data) {
            $scope.groups = [];
            for(var i in data) {
                getGroupMembers(data[i]);
            }
        
            LoaderService.hide();
        });
    };



    $scope.getThumbnailColor = function(groupName) {

        if(typeof groupName === 'undefined')
            return;
        
        var colors = ["#66D8BA","#f16364","#f58559","#f9a43e","#e4c62e","#67bf74","#59a2be","#2093cd","#ad62a7"];

        hashCode = function(str) {
            var str = str.toUpperCase();
            var hash = 0;
            if (str.length == 0) return hash;
            for (i = 0; i < str.length && i<3; i++) {
                char = str.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash;
            }
            return hash;
        };

        groupName_number = Math.abs(hashCode(groupName)*1)%(colors.length);

        return colors[groupName_number];
    }
    
    $scope.getGroups();

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});