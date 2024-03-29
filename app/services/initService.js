App.service('initService', function($timeout, $ionicHistory, API_ROUTES, LocalStorageService, GENERAL_CONFIG, DB_CONFIG, SQLiteService, SyncService) {

    var appName = GENERAL_CONFIG.APP_NAME,
        db_name = DB_CONFIG.DB_NAME;
        db_tables = DB_CONFIG.TABLES,
        db_tables_sql = DB_CONFIG.CREATE_SQL
        db_tables, db_tables_sql;

    var APIData = API_ROUTES['sync'];

    var TABLES_TO_SYNC = [
        {
            tableName : 'users',
            idName : 'UserId',
            serverId: 'user_id',
            associations : [],
            trigger: true
        },
    
        {
            tableName : 'groups', 
            idName : 'GroupId',
            serverId : 'group_id',
            associations : ['users'],
            trigger: true
        },
        {
            tableName : 'groups_users', 
            idName : 'GroupsUserId', 
            serverId : 'groups_user_id', 
            associations : ['groups', 'users'],
            trigger: true
        },
        {
            tableName : 'entries', 
            idName : 'EntryId',
            serverId : 'entry_id',
            associations : ['groups', 'groups_users'],
            trigger: true
        },
        {
            tableName : 'entries_groups_users', 
            idName : 'EntriesGroupsUserId',
            serverId : 'entries_groups_user_id',
            associations : ['entries', 'groups_users'],
            trigger: true
        },
        {
            tableName : 'groups_requests', 
            idName : 'GroupRequestId',
            serverId : 'groups_request_id',
            associations : ['users', 'groups'],
            trigger : false,
            syncWay: 'down'
        },
        {
            tableName : 'categories', 
            idName : 'id',
            associations: [],
            trigger: false,
            syncWay: 'down'
        },

    ];

    var sync_info = {
        lastSyncDate: '0',
        version: GENERAL_CONFIG.APP_VERSION,
        locale: LocalStorageService.get("locale")
    };

    var _db = window.openDatabase(DB_CONFIG.DB_NAME, DB_CONFIG.VERSION, DB_CONFIG.SUB_NAME, DB_CONFIG.SIZE);

    var SQLite = (new SQLiteService());

    initSync = function(callback) {
        SyncService.initSync(TABLES_TO_SYNC, _db, sync_info, GENERAL_CONFIG['API_URL'] + APIData.url, function() {
            if(callback) callback();
        });
    }

    this.init = function(callback) {
        SQLite.init_db(_db, appName,db_name,db_tables,db_tables_sql, false, function() {
            initSync(callback);
        });
        LocalStorageService.set('app_version', GENERAL_CONFIG.APP_VERSION);
    }

    this.reInit = function(callback,clearCredentials) {
        console.log("---- DB RE INIT START ----");
        
        if(typeof clearCredentials=='undefined' || clearCredentials===true) {
            LocalStorageService.clear("user_email");
            LocalStorageService.clear("user_id");
            LocalStorageService.clear("user_name");
            LocalStorageService.clear("user_basic");
            LocalStorageService.clear("user_password");
            LocalStorageService.clear("login");
        }
        $timeout(function () {
            $ionicHistory.clearCache();
            $ionicHistory.clearHistory();
        }, 1500)
        LocalStorageService.set('app_version', GENERAL_CONFIG.APP_VERSION);
        SQLite.init_db(_db,appName,db_name,db_tables,db_tables_sql, true, function() {
            initSync(function() {
                SyncService.setFirstSync();
                if(callback && typeof callback == 'function')
                    callback();
            });
        });
    }
});