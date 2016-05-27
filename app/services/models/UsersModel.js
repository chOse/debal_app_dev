App.factory('UsersModel', function(SQLiteService, DB_CONFIG) {

    return {
        read : function(where, callback){
            var DB = new SQLiteService();
            DB.select();
            DB.from("users");
            if(arguments.length === 2)
                for(var i in where)
                    DB.where(i+' = "'+where[i]+'"');
            else callback = where;
            DB.query(callback);
        },
        create : function(data, callback){
            (new SQLiteService())
                    .insert("users", data, callback);
        },
        getUserId : function(user_id, callback) {
            var DB = new SQLiteService();
            DB.select('UserId');
            DB.from("users");
            DB.where("id = "+ user_id);
            DB.query(callback);
        },
        update : function (data, callback) {
            (new SQLiteService())
                .update("users", data, null, "UserId="+data.UserId, callback);
        },
        delete : function(UserId, callback) {
            (new SQLiteService())
                .remove("users", "UserId="+UserId, callback);
        },
        update_user_details : function(data, callback) {
            data.id = data.user_id;
            (new SQLiteService()).insert("users_details", data, null, callback)
        },
        get_user_details : function(user_id, callback) {
            var DB = new SQLiteService();
            DB.select();
            DB.from("users_details");
            DB.where("user_id = "+ user_id);
            DB.query(callback);
        }
    };

});