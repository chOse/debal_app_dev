App.service('LoginService', function(LocalStorageService, initService, $http, SyncService) {


    this.login = function(userData, callback) {

        var pwd = userData.password;
        SyncService.api_send("auth", userData, function(data, status) {
            if(data.result == "OK") 
                changeLoginStatus(true, data.data, pwd);

            callback(data, status);
                    
        });
    };

    this.facebook_connect = function(userData, callback) {
        SyncService.api_send("facebook_connect", userData, callback);
    };
    
    this.register = function(userData, callback)  {

        var pwd = userData.data.password;

        SyncService.api_send("register", userData, function(data, status) {

            if(data.result=="OK")
                changeLoginStatus(true, data.data, pwd);

            callback(data, status);
        });
    };
    
    this.isLogged = function() {
        return LocalStorageService.get("login");
    };
    
    var changeLoginStatus = function(status, data, pwd) {

        LocalStorageService.set("login", status);

        if(status===true) {

            var user_email = data.email;
            var user_id = data.id;
            var user_name = data.username;

            LocalStorageService.set("user_email", user_email);
            LocalStorageService.set("user_name", user_name);
            LocalStorageService.set("user_id", user_id);
            LocalStorageService.set("user_basic", btoa(user_email + ":" + pwd));
        }
    };
});