import * as libCoki from "cookie";
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";

interface Env {
  REDIRECT_URI: string;
  ONEDRIVE_CLIENT_ID: string;
  ONEDRIVE_CLIENT_SECRET: string;
  GOOGDRIVE_CLIENT_ID: string;
  GOOGDRIVE_CLIENT_SECRET: string;
  COOKIE_MAXAGE: string; // days
  HMAC_METHOD: string;
  HMAC_KEY: string;
  CRYPT_IV: string;
  CRYPT_METHOD: string;
}

interface LsKeyInfo {
  newkey: boolean;
  lsauth: string;
}

interface DriveInfo {
  client_id: string;
  client_secret: string;
  login_url: string;
  login_scope: string;
  login_extdat?: Record<string, string>;
  token_url: string;
  token_scope: string;
  logout_url: string;
}

class GrantAuth {
  private HMAC_KEY: Buffer;
  private env: Env;
  private redirectUri: string;
  private localhost: boolean;
  private fields: FormData;
  private cookies: Record<string, string>;
  private reshdrs: Headers;

  public async process(env: Env, req: Request): Promise<Response> {
    this.HMAC_KEY = Buffer.from(env.HMAC_KEY);
    this.env = env;
    this.redirectUri = env.REDIRECT_URI;
    this.localhost = (this.redirectUri.substring(0, 17) == "http://localhost:");
    this.reshdrs = new Headers();
    this.reshdrs.append("Access-Control-Allow-Origin", this.getBaseUrl(this.redirectUri));
    this.reshdrs.append("Access-Control-Allow-Credentials", "true");
    this.reshdrs.append("Content-Type", "application/json;charset=UTF-8");

    this.fields = await req.formData();
    if (req.headers.has("cookie")) {
      this.cookies = libCoki.parse(req.headers.get("cookie"));
    }
    return await this.grantauth();
  }

  private async grantauth(): Promise<Response> {
    let result: LsKeyInfo | Record<string, string> = null;
    switch (this.fields.get("drive_type")) {
      case "localstorage":
        result = await this.getLocalStorageAuth() as LsKeyInfo;
        break;
      case "onedrive":
        //https://docs.microsoft.com/ja-jp/azure/active-directory/develop/v2-oauth2-auth-code-flow
        result = await this.getDriveAuth({
          "client_id": this.env.ONEDRIVE_CLIENT_ID,
          "client_secret": this.env.ONEDRIVE_CLIENT_SECRET,
          "login_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
          "login_scope": "offline_access files.readwrite",
          "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          "token_scope": "files.readwrite",
          "logout_url": "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=" + this.redirectUri,
        });
        break;
      case "googledrive":
        result = await this.getDriveAuth({
          "client_id": this.env.GOOGDRIVE_CLIENT_ID,
          "client_secret": this.env.GOOGDRIVE_CLIENT_SECRET,
          "login_url": "https://accounts.google.com/o/oauth2/v2/auth",
          "login_scope": "https://www.googleapis.com/auth/drive.file",
          "login_extdat": {
            "access_type": "offline",
            "prompt": "consent"
          },
          "token_url": "https://www.googleapis.com/oauth2/v4/token",
          "token_scope": "https://www.googleapis.com/auth/drive.file",
          "logout_url": "https://accounts.google.com/Logout",
        });
        break;
      default:
        result = {
          "error": "invalid_drive_type",
          "error_description": "Unknown drive type.",
        };
    }
    return this.endProcess(result);
  }

  private async getLocalStorageAuth(keyOnly?: boolean): Promise<LsKeyInfo | Buffer> {
    let lskey: Buffer = null;
    let lskey64: string = this.cookies ? this.cookies["lskey"] : null;
    let newkey: boolean = false;
    if (lskey64) {
      lskey = Buffer.from(lskey64, "base64");
    } else {
      lskey = Buffer.alloc(20);
      webcrypto.getRandomValues(lskey);
      lskey64 = lskey.toString("base64");
      newkey = true;
    }
    let samesite: boolean | "lax" | "strict" | "none" = false;
    let sec: boolean = false;
    if (this.localhost) {
      samesite = "strict";
      sec = false;
    } else {
      samesite = "none";
      sec = true;
    }
    this.reshdrs.append("Set-Cookie", libCoki.serialize("lskey", lskey64, {
      "httpOnly": true,
      "maxAge": 86400 * parseInt(this.env.COOKIE_MAXAGE),
      "path": "/",
      "sameSite": samesite,
      "secure": sec,
    }));

    if (keyOnly) {
      return lskey;
    } else {
      let lsauth: string = await this.hmac(lskey);
      return {
        "newkey": newkey,
        "lsauth": lsauth,
      };
    }
  }

  private async getDriveAuth(infs: DriveInfo): Promise<Record<string, string>> {
    let data: URLSearchParams = new URLSearchParams({
      "client_id": this.fields.get("client_id") ? this.fields.get("client_id") : infs["client_id"],
      "redirect_uri": this.fields.get("redirect_uri") ? this.fields.get("redirect_uri") : this.redirectUri,
    });
    let action: string = this.fields.get("action");
    let ret: Record<string, string> = {
      "logout": infs["logout_url"],
    };
    if (action && action.toLowerCase() == "logout") {
      return ret;
    }

    let cscenc: string = null;
    let csc: string = this.fields.get("client_secret");
    let hmacsc: string = null;
    if (csc) {
      if (this.localhost) {
        console.log("Using customized client informations.");
      }
      if (csc.length > 4 && csc.substring(0, 2) == "zB") {
        cscenc = csc.substring(4);
        hmacsc = await this.hmac(cscenc);
        if (hmacsc.substring(5, 7) == csc.substring(2, 4)) {
          if (this.localhost) {
            console.log("Decrypting client secret.");
          }
          csc = await this.cryptData(cscenc, false);
        } else {
          cscenc = null;
        }
      }
      if (cscenc) {
        cscenc = null;
      } else {
        if (this.localhost) {
          console.log("Encrypting client secret.");
        }
        cscenc = await this.cryptData(csc, true);
        hmacsc = await this.hmac(cscenc);
        cscenc = "zB" + hmacsc.substring(5, 7) + cscenc;
      }
    } else {
      csc = infs["client_secret"];
    }
    if (cscenc) {
      ret["client_secret_enc"] = cscenc;
    }

    let code: string = this.fields.get("code");
    let rftoken: string = this.fields.get("refresh_token");
    if (code || rftoken) {
      data.append("scope", infs["token_scope"]);
      data.append("client_secret", csc);
      if (code) {
        data.append("code", code);
        data.append("grant_type", "authorization_code");
      } else {
        data.append("refresh_token", await this.cryptData(rftoken, false));
        data.append("grant_type", "refresh_token");
      }
      let resp = await fetch(infs["token_url"], {
        "method": "POST",
        "body": data.toString(),
        "redirect": "follow",
        "headers": new Headers({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      });
      let respdat: Record<string, string> = (await resp.json().catch((a_err) => {
        console.error(a_err);
      })) as Record<string, string>;
      if (respdat) {
        ret = {
          ...respdat,
          ...ret,
        };
        if (respdat["refresh_token"]) {
          ret["refresh_token"] = await this.cryptData(respdat["refresh_token"], true);
        }
      } else {
        ret = {
          "error": "auth_failed",
          "error_description": "Failed to connect token_url.",
          ...ret,
        };
      }

    } else {
      data.append("scope", infs["login_scope"]);
      if (this.fields.get("need_code")) {
        data.append("response_type", "code");
        if (infs["login_extdat"]) {
          for (let k in infs["login_extdat"]) {
            data.append(k, infs["login_extdat"][k]);
          }
        }
      } else {
        data.append("response_type", "token");
      }
      let state: Buffer = Buffer.alloc(20);
      webcrypto.getRandomValues(state);
      var state64: string = state.toString("base64");
      ret = {
        "url": infs["login_url"] + "?" + data.toString(),
        "state": state64,
        ...ret,
      };
    }
    return ret;
  }

  private async cryptData(data: Buffer | string, encrypt?: boolean): Promise<string> {
    const ivlen: number = 16;
    let iv: string = this.env.CRYPT_IV.substring(0, ivlen);
    let lskey: Buffer = await this.getLocalStorageAuth(true) as Buffer;
    lskey = Buffer.concat([
      lskey,
      Buffer.from(this.env.CRYPT_IV.substring(ivlen), "utf8"),
    ]);
    let cinfarr: Array<string> = this.env.CRYPT_METHOD.split("-");
    let keylen: number = 16;
    let aes: webcrypto.Algorithm = {
      "name": this.env.CRYPT_METHOD,
    };
    if (cinfarr.length == 3) {
      if (cinfarr[1] == "192" || cinfarr[1] == "256") {
        keylen = parseInt(cinfarr[1], 10) / 8;
      }
      aes["name"] = cinfarr[0] + "-" + cinfarr[2];
    }
    switch (aes["name"]) {
      case "AES-CBC":
      case "AES-GCM":
        aes["iv"] = Uint8Array.from(Buffer.from(iv));
        break;
      case "AES-CTR":
        aes["counter"] = Uint8Array.from(Buffer.from(iv));
        aes["length"] = 64;
        break;
    }
    let key: ArrayBuffer = await webcrypto.subtle.digest("SHA-256", lskey);
    let u8key: Uint8Array = new Uint8Array(key.slice(0, keylen));
    let cptkey: webcrypto.CryptoKey = await webcrypto.subtle.importKey("raw", u8key, aes["name"] as string, false, [encrypt ? "encrypt" : "decrypt"]);
    let dataOut: ArrayBuffer = null;
    if (encrypt) {
      if (typeof data == "string") {
        data = Buffer.from(data, "utf8");
      }
      dataOut = await webcrypto.subtle.encrypt(aes, cptkey, Uint8Array.from(data));
      return Buffer.from(dataOut).toString("base64");
    } else {
      if (typeof data == "string") {
        data = Buffer.from(data, "base64");
      }
      dataOut = await webcrypto.subtle.decrypt(aes, cptkey, Uint8Array.from(data));
      return Buffer.from(dataOut).toString("utf8");
    }
  }

  private endProcess(result: LsKeyInfo | Record<string, string>): Response {
    let dat: string = null;
    if (typeof result == "string") {
      dat = result;
    } else {
      dat = JSON.stringify(result);
    }
    return new Response(dat, {
      status: 200,
      statusText: "POST OK",
      headers: this.reshdrs,
    });
  }

  private getBaseUrl(url: string): string {
    let i: number = url.indexOf("://");
    if (i > 0) {
      i = url.indexOf("/", i + 3);
      if (i > 0) {
        return url.substring(0, i);
      } else {
        return url;
      }
    }
    return "";
  }

  private async hmac(data: Buffer | string): Promise<string> {
    let algorithm: webcrypto.HmacImportParams = {
      name: "HMAC",
      hash: this.env.HMAC_METHOD,
    };
    if (typeof data == "string") {
      data = Buffer.from(data, "utf8");
    }
    let key: webcrypto.CryptoKey = await webcrypto.subtle.importKey("raw", this.HMAC_KEY, algorithm, false, ["sign"]);
    let ret: ArrayBuffer = await webcrypto.subtle.sign(algorithm.name, key, data);
    return Buffer.from(ret).toString("base64");
  }
}

export const onRequest: PagesFunction<Env> = async (ctxt) => {
  const req: Request = ctxt.request;
  if (req.method == "POST") {
    let ga: GrantAuth = new GrantAuth();
    return await ga.process(ctxt.env, ctxt.request);

  } else {
    return new Response(null, {
      status: 405,
      statusText: "Method Not Allowed.",
    });
  }
}
