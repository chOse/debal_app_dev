App.service('LoginService', function(LocalStorageService, SyncService, initService) {


    this.login = function(userData, callback) {

        var pwd = userData.password;
        var _this = this;
        SyncService.api_send("auth", userData, function(data, status) {
            if(typeof data != "undefined" && typeof data.result!="undefined" && data.result == "OK") 
                _this.changeLoginStatus(true, data.data, pwd);

            callback(data, status);
                    
        });
    };

    this.facebook_connect = function(userData, callback) {
        SyncService.api_send("facebook_connect", userData, callback);
    };
    
    this.register = function(userData, callback)  {

        var pwd = userData.data.password;
        var _this = this;
        SyncService.api_send("register", userData, function(data, status) {

            if(data.result=="OK")
                _this.changeLoginStatus(true, data.data, pwd);

            callback(data, status);
        });
    };
    
    this.isLogged = function() {
        return LocalStorageService.get("login");
    };
    
    this.changeLoginStatus = function(status, data, pwd) {

        LocalStorageService.set("login", status);

        // Connect
        if(status===true) {

            var user_email = data.email;
            var user_id = data.id;
            var user_name = data.username;

            // Analytics
            if (typeof analytics !== 'undefined')
                analytics.setUserId(user_id);

            // Intercom
            if(typeof intercom != 'undefined') {
                intercom.registerIdentifiedUser({userId: user_id});
                intercom.updateUser({ email: user_email, name: user_name, locale: LocalStorageService.get("locale") });
            }

            LocalStorageService.set("user_email", user_email);
            LocalStorageService.set("user_name", user_name);
            LocalStorageService.set("user_id", user_id);
            LocalStorageService.set("user_basic", btoa(user_email + ":" + pwd));
        }

        // Disconnect
        else if(status===false) {
            initService.reInit();

            // Intercom
            if(typeof intercom != 'undefined') {
                intercom.reset();
            }
        }
    };
});