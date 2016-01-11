App.factory('GroupRequestsModel', function(SQLiteService, DB_CONFIG, LocalStorageService) {

    return {
        read_pending : function(callback){
            var DB = new SQLiteService();
            var current_user_id = LocalStorageService.get("user_id");
            if(!current_user_id)
                return callback();
            DB.select("u.username, u.UserId, u.email, gr.GroupRequestId, gr.id, gr.created, gr.GroupId, gr.status, g.name as groupName");
            DB.from("groups_requests as gr");
            DB.join("users as u", "gr.UserId = u.UserId");
            DB.join("groups as g", "gr.GroupId = g.GroupId");
            DB.where('status=0');
            DB.where('gr.user_id!=' + LocalStorageService.get("user_id"));
            DB.order_by("gr.created DESC");
            DB.query(callback);
        },

        update : function (GroupRequestId, status, callback){
            (new SQLiteService())
                .update("groups_requests", {status:status}, null, "GroupRequestId="+data.GroupRequestId, callback);
        },

        delete : function(GroupRequestId, callback) {
            (new SQLiteService())
                .remove("groups_requests", "GroupRequestId="+GroupRequestId, callback);
        }
    };

});