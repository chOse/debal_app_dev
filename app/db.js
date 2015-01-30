(function() {
    var 
    config_data = {
        DB_CONFIG: {
            DB_NAME : "debal",

            TABLES : ["entries", "entries_groups_users", "groups", "groups_users", "users", "categories", "categories_entries"],

            CREATE_SQL : [
                'CREATE TABLE IF NOT EXISTS `entries` (\n\
                `EntryId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `amount` INTEGER,\n\
                `date` TEXT,\n\
                `group_id` INTEGER,\n\
                `groups_user_id` INTEGER,\n\
                `GroupId` INTEGER,\n\
                `GroupsUserId` INTEGER,\n\
                `title` TEXT,\n\
                `deleted` INTEGER DEFAULT \'0\',\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `entries_groups_users` (\n\
                `EntriesGroupsUserId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `entry_id` INTEGER,\n\
                `groups_user_id` INTEGER,\n\
                `EntryId` INTEGER,\n\
                `GroupsUserId` INTEGER,\n\
                `shared_amount` INTEGER,\n\
                `share` INTEGER DEFAULT \'1\',\n\
                UNIQUE (id) ON CONFLICT REPLACE,\n\
                UNIQUE (EntryId,GroupsUserId) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `groups` (\n\
                `GroupId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `name` TEXT,\n\
                `UserId` INTEGER,\n\
                `user_id` INTEGER,\n\
                `currency` TEXT \'EUR\',\n\
                `private` INTEGER DEFAULT \'0\',\n\
                `public_key` TEXT,\n\
                `deleted` INTEGER DEFAULT \'0\',\n\
                `created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `groups_users` (\n\
                `GroupsUserId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `group_id` INTEGER,\n\
                `user_id` INTEGER,\n\
                `GroupId` INTEGER,\n\
                `UserId` INTEGER,\n\
                `invite_email` TEXT,\n\
                `invite_date` TIMESTAMP,\n\
                `share` INTEGER DEFAULT \'1\',\n\
                `deleted` INTEGER DEFAULT \'0\',\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `users` (\n\
                `UserId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `username` TEXT,\n\
                `email` TEXT,\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `categories` (\n\
                `CategoryId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `group_id` INTEGER,\n\
                `GroupId` INTEGER,\n\
                `name` TEXT,\n\
                `deleted` INTEGER DEFAULT \'0\',\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `categories_entries` (\n\
                `CategoriesEntryId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `category_id` INTEGER,\n\
                `CategoryId` INTEGER,\n\
                `entry_id` INTEGER,\n\
                `EntryId` INTEGER,\n\
                `deleted` INTEGER DEFAULT \'0\',\n\
                UNIQUE (id) ON CONFLICT REPLACE)',

                'CREATE TABLE IF NOT EXISTS `groups_requests` (\n\
                `GroupRequestId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                `id` INTEGER,\n\
                `user_id` INTEGER,\n\
                `UserId` INTEGER,\n\
                `group_id` INTEGER,\n\
                `GroupId` INTEGER,\n\
                `status` INTEGER DEFAULT \'0\',\n\
                `created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n\
                UNIQUE (id) ON CONFLICT REPLACE)',
            ],

            RECREATE_DB : false,
            SIZE : 200000,
            VERSION : "1.0",
            SUB_NAME : "WebSQL Storage"
        }
    },

    config_module = angular.module('spendingsManager.db', []);
    
    angular.forEach(config_data, function(key, value) {
        config_module.constant(value, key);
    });
    
}());