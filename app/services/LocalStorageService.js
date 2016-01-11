App.factory('LocalStorageService', function(GENERAL_CONFIG) {

    var Storage = localStorage,
        clear = false,
        APP_NAME = (GENERAL_CONFIG.APP_NAME + "_");
        
        if(clear)
            Storage.clear();
        
    return {
        set: function(k, v) {
            k = (APP_NAME + k);
            if (arguments.length !== 2)
                return false;
            if (v && typeof(v) !== "string"){
                var v = JSON.stringify(v);
            }
            Storage.setItem(k, v);
            return true;
        },
        get: function(k) {
            k = (APP_NAME + k);
            if (arguments.length !== 1)
                return false;
            var result = Storage.getItem(k);
            if (result === null)
                return false;
            if (result.match(/\[.*\]|\{.*\}/)) {
                return JSON.parse(result);
            } else {
                return result;
            }
            return false;
        },
        array_push : function(k, v){
            var current_value = this.get(k);
            if(empty(current_value))
                current_value = [];
            else if(!is_array(current_value))
                return false;
            current_value.push(v);
            return this.set(k, current_value); 
        },
        clear: function(item) {
            return (arguments.length === 1 ? Storage.removeItem(APP_NAME + item) : Storage.clear());
        }
    };

});