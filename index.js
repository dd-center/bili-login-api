let urlencode = require('urlencode');
let NodeRsa = require('node-rsa');
let crypto = require('crypto');
let got = require('got');
let userAgent = 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36';
let getSign = (str,secretkey)=>{
    let md5 = crypto.createHash('md5');
    return md5.update(`${str}${secretkey}`).digest('hex');
};
let getRequestKey = async ()=>{
    return JSON.parse((await got(`http://passport.bilibili.com/login?act=getkey`,{
        method:'get',
        headers: {
            "user-agent":userAgent
        }
    })).body);
};
let encrypt = (key,str)=>{
    let pubKey = new NodeRsa(key);
    pubKey.setOptions({
        encryptionScheme: 'pkcs1'
    });
    return pubKey.encrypt(str,'base64','utf8');
};
let login = async (user,pass,appkey,secretkey)=>{
    let {hash,key} = await getRequestKey();
    let pwd = encrypt(key,hash+pass);
    let params = `appkey=${appkey}&password=${urlencode(pwd)}&username=${urlencode(user)}`;
    let loginResult = await got(`https://passport.bilibili.com/api/v2/oauth2/login?${params}&sign=${getSign(params,secretkey)}`,{
            method:"POST",
            headers:{
                "user-agent":userAgent
            }
        });
    return JSON.parse(loginResult.body);
};
class LoginApi {
    constructor(appkey,secretkey){
        this._appkey = appkey;
        this._secretkey = secretkey;
        this.refreshToken = this.refreshToken.bind(this);
        this.getCookies = this.getCookies.bind(this);
        this.login = this.login.bind(this);
    }
    async login (user,pass){
        let loginResult = await login(user,pass,this._appkey,this._secretkey);
        if (loginResult.code===0){
            this._mid = loginResult.data.mid;
            this._access_token = loginResult.data.token_info.access_token;
            this._ts = loginResult.ts+2592000;
        }else if(loginResult.code===-629){
            throw("账号或密码错误");
        }else {
            throw ("未知错误");
        }
    }
    async refreshToken (){
        if((!this._ts)||(this._ts*1000<Date.now())){
            throw ("未登录");
        }else {
            let refreshResult = JSON.parse((await got(`https://api.kaaass.net/biliapi/user/refreshToken?access_key=${this._access_token}`)).body);
            if(refreshResult.status==='OK'){
                this._ts = refreshResult.expires;
            }else {
                throw ("刷新错误");
            }
        }
    }
    async getCookies(){
        if((!this._ts)||(this._ts*1000<Date.now())){
            throw ("未登录");
        }else {
            let res = JSON.parse((await got(`https://api.kaaass.net/biliapi/user/sso?access_key=${this._access_token}`)).body);
            if(res.status==='OK'){
                return res.cookie;
            }else {
                throw ("获取Cookie失败");
            }
        }
    }
}
module.exports = LoginApi;