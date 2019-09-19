#bili-login-api  

##example  
```$xslt  
let LoginApi = require('bili-login-api');

(async ()=>{
    let api = new LoginApi(appkey,secretkey);
    await api.login(user,pass);
    let cookies = await api.getCookies();
    
    //reflush token
    await api.refreshToken();
})();
```