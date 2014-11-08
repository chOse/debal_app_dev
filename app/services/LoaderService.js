App
.factory('LoaderService', function($rootScope, $ionicLoading) {

  return {
        show : function() {
            $rootScope.loading = $ionicLoading.show({
                templateUrl: 'app/views/loader.html',
                duration: 10000,
                animation: 'fade-in',
            });
        },
        show_long : function() {
            $rootScope.loading = $ionicLoading.show({
                templateUrl: 'app/views/loader.html',
                duration: 20000,
                animation: 'fade-in',
            });
        },
        show_small : function() {
            $rootScope.loading = $ionicLoading.show({
                templateUrl: 'app/views/loader_small.html',
                duration: 6000,
                animation: 'fade-in',
                noBackdrop: true,
            });
        },
        hide : function(){
            $ionicLoading.hide(); 
        }
    };
});