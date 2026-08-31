var qo="160";var Xh=0,vc=1,qh=2;var na=1,Yo=2,Gn=3,oi=0,hn=1,pn=2;var si=0,ss=1,Mc=2,Ec=3,Sc=4,Yh=5,wi=100,Zh=101,Jh=102,bc=103,wc=104,$h=200,Kh=201,jh=202,Qh=203,no=204,io=205,eu=206,tu=207,nu=208,iu=209,su=210,ru=211,au=212,ou=213,cu=214,lu=0,hu=1,uu=2,wr=3,du=4,fu=5,pu=6,mu=7,Yl=0,gu=1,_u=2,ri=0,xu=1,yu=2,vu=3,Mu=4,Eu=5,Su=6;var Zl=300,os=301,cs=302,so=303,ro=304,ia=306,ls=1e3,An=1001,ao=1002,sn=1003,Tc=1004;var Ma=1005;var _n=1006,bu=1007;var Os=1008;var ai=1009,wu=1010,Tu=1011,Zo=1012,Jl=1013,ni=1014,ii=1015,Fs=1016,$l=1017,Kl=1018,Ai=1020,Au=1021,Rn=1023,Ru=1024,Cu=1025,Ri=1026,hs=1027,Pu=1028,jl=1029,Lu=1030,Ql=1031,eh=1033,Ea=33776,Sa=33777,ba=33778,wa=33779,Ac=35840,Rc=35841,Cc=35842,Pc=35843,th=36196,Lc=37492,Ic=37496,Dc=37808,Uc=37809,Nc=37810,Oc=37811,Fc=37812,Bc=37813,Hc=37814,zc=37815,Vc=37816,Gc=37817,kc=37818,Wc=37819,Xc=37820,qc=37821,Ta=36492,Yc=36494,Zc=36495,Iu=36283,Jc=36284,$c=36285,Kc=36286;var Tr=2300,Ar=2301,Aa=2302,jc=2400,Qc=2401,el=2402;var nh=3e3,Ci=3001,Du=3200,Uu=3201,ih=0,Nu=1,xn="",$t="srgb",Xn="srgb-linear",Jo="display-p3",sa="display-p3-linear",Rr="linear",Pt="srgb",Cr="rec709",Pr="p3";var Hi=7680;var tl=519,Ou=512,Fu=513,Bu=514,sh=515,Hu=516,zu=517,Vu=518,Gu=519,nl=35044;var il="300 es",oo=1035,Wn=2e3,Lr=2001,ci=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},Qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Ra=Math.PI/180,co=180/Math.PI;function qs(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Qt[i&255]+Qt[i>>8&255]+Qt[i>>16&255]+Qt[i>>24&255]+"-"+Qt[e&255]+Qt[e>>8&255]+"-"+Qt[e>>16&15|64]+Qt[e>>24&255]+"-"+Qt[t&63|128]+Qt[t>>8&255]+"-"+Qt[t>>16&255]+Qt[t>>24&255]+Qt[n&255]+Qt[n>>8&255]+Qt[n>>16&255]+Qt[n>>24&255]).toLowerCase()}function Kt(i,e,t){return Math.max(e,Math.min(t,i))}function ku(i,e){return(i%e+e)%e}function Ca(i,e,t){return(1-t)*i+t*e}function sl(i){return(i&i-1)===0&&i!==0}function lo(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function As(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function ln(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var we=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Kt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},pt=class i{constructor(e,t,n,s,r,o,a,c,l){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,c,l)}set(e,t,n,s,r,o,a,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],u=n[7],f=n[2],p=n[5],x=n[8],M=s[0],m=s[3],d=s[6],E=s[1],y=s[4],C=s[7],U=s[2],T=s[5],P=s[8];return r[0]=o*M+a*E+c*U,r[3]=o*m+a*y+c*T,r[6]=o*d+a*C+c*P,r[1]=l*M+h*E+u*U,r[4]=l*m+h*y+u*T,r[7]=l*d+h*C+u*P,r[2]=f*M+p*E+x*U,r[5]=f*m+p*y+x*T,r[8]=f*d+p*C+x*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-n*r*h+n*a*c+s*r*l-s*o*c}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,f=a*c-h*r,p=l*r-o*c,x=t*u+n*f+s*p;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let M=1/x;return e[0]=u*M,e[1]=(s*l-h*n)*M,e[2]=(a*n-s*o)*M,e[3]=f*M,e[4]=(h*t-s*c)*M,e[5]=(s*r-a*t)*M,e[6]=p*M,e[7]=(n*c-l*t)*M,e[8]=(o*t-n*r)*M,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+e,-s*l,s*c,-s*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Pa.makeScale(e,t)),this}rotate(e){return this.premultiply(Pa.makeRotation(-e)),this}translate(e,t){return this.premultiply(Pa.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Pa=new pt;function rh(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Ir(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Wu(){let i=Ir("canvas");return i.style.display="block",i}var rl={};function Is(i){i in rl||(rl[i]=!0,console.warn(i))}var al=new pt().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),ol=new pt().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),tr={[Xn]:{transfer:Rr,primaries:Cr,toReference:i=>i,fromReference:i=>i},[$t]:{transfer:Pt,primaries:Cr,toReference:i=>i.convertSRGBToLinear(),fromReference:i=>i.convertLinearToSRGB()},[sa]:{transfer:Rr,primaries:Pr,toReference:i=>i.applyMatrix3(ol),fromReference:i=>i.applyMatrix3(al)},[Jo]:{transfer:Pt,primaries:Pr,toReference:i=>i.convertSRGBToLinear().applyMatrix3(ol),fromReference:i=>i.applyMatrix3(al).convertLinearToSRGB()}},Xu=new Set([Xn,sa]),wt={enabled:!0,_workingColorSpace:Xn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(i){if(!Xu.has(i))throw new Error(`Unsupported working color space, "${i}".`);this._workingColorSpace=i},convert:function(i,e,t){if(this.enabled===!1||e===t||!e||!t)return i;let n=tr[e].toReference,s=tr[t].fromReference;return s(n(i))},fromWorkingColorSpace:function(i,e){return this.convert(i,this._workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this._workingColorSpace)},getPrimaries:function(i){return tr[i].primaries},getTransfer:function(i){return i===xn?Rr:tr[i].transfer}};function rs(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function La(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var zi,Dr=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{zi===void 0&&(zi=Ir("canvas")),zi.width=e.width,zi.height=e.height;let n=zi.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=zi}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Ir("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=rs(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(rs(t[n]/255)*255):t[n]=rs(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},qu=0,Ur=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:qu++}),this.uuid=qs(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Ia(s[o].image)):r.push(Ia(s[o]))}else r=Ia(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function Ia(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Dr.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Yu=0,vn=class i extends ci{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=An,s=An,r=_n,o=Os,a=Rn,c=ai,l=i.DEFAULT_ANISOTROPY,h=xn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Yu++}),this.uuid=qs(),this.name="",this.source=new Ur(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(Is("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===Ci?$t:xn),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Zl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ls:e.x=e.x-Math.floor(e.x);break;case An:e.x=e.x<0?0:1;break;case ao:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ls:e.y=e.y-Math.floor(e.y);break;case An:e.y=e.y<0?0:1;break;case ao:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return Is("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===$t?Ci:nh}set encoding(e){Is("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===Ci?$t:xn}};vn.DEFAULT_IMAGE=null;vn.DEFAULT_MAPPING=Zl;vn.DEFAULT_ANISOTROPY=1;var Zt=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,c=e.elements,l=c[0],h=c[4],u=c[8],f=c[1],p=c[5],x=c[9],M=c[2],m=c[6],d=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-M)<.01&&Math.abs(x-m)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+M)<.1&&Math.abs(x+m)<.1&&Math.abs(l+p+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let y=(l+1)/2,C=(p+1)/2,U=(d+1)/2,T=(h+f)/4,P=(u+M)/4,z=(x+m)/4;return y>C&&y>U?y<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(y),s=T/n,r=P/n):C>U?C<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(C),n=T/s,r=z/s):U<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(U),n=P/r,s=z/r),this.set(n,s,r,t),this}let E=Math.sqrt((m-x)*(m-x)+(u-M)*(u-M)+(f-h)*(f-h));return Math.abs(E)<.001&&(E=1),this.x=(m-x)/E,this.y=(u-M)/E,this.z=(f-h)/E,this.w=Math.acos((l+p+d-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ho=class extends ci{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Zt(0,0,e,t),this.scissorTest=!1,this.viewport=new Zt(0,0,e,t);let s={width:e,height:t,depth:1};n.encoding!==void 0&&(Is("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),n.colorSpace=n.encoding===Ci?$t:xn),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:_n,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},n),this.texture=new vn(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=n.generateMipmaps,this.texture.internalFormat=n.internalFormat,this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}setSize(e,t,n=1){(this.width!==e||this.height!==t||this.depth!==n)&&(this.width=e,this.height=t,this.depth=n,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new Ur(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},qn=class extends ho{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Nr=class extends vn{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=sn,this.minFilter=sn,this.wrapR=An,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var uo=class extends vn{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=sn,this.minFilter=sn,this.wrapR=An,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var li=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],f=r[o+0],p=r[o+1],x=r[o+2],M=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=f,e[t+1]=p,e[t+2]=x,e[t+3]=M;return}if(u!==M||c!==f||l!==p||h!==x){let m=1-a,d=c*f+l*p+h*x+u*M,E=d>=0?1:-1,y=1-d*d;if(y>Number.EPSILON){let U=Math.sqrt(y),T=Math.atan2(U,d*E);m=Math.sin(m*T)/U,a=Math.sin(a*T)/U}let C=a*E;if(c=c*m+f*C,l=l*m+p*C,h=h*m+x*C,u=u*m+M*C,m===1-a){let U=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=U,l*=U,h*=U,u*=U}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[o],f=r[o+1],p=r[o+2],x=r[o+3];return e[t]=a*x+h*u+c*p-l*f,e[t+1]=c*x+h*f+l*u-a*p,e[t+2]=l*x+h*p+a*f-c*u,e[t+3]=h*x-a*u-c*f-l*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(s/2),u=a(r/2),f=c(n/2),p=c(s/2),x=c(r/2);switch(o){case"XYZ":this._x=f*h*u+l*p*x,this._y=l*p*u-f*h*x,this._z=l*h*x+f*p*u,this._w=l*h*u-f*p*x;break;case"YXZ":this._x=f*h*u+l*p*x,this._y=l*p*u-f*h*x,this._z=l*h*x-f*p*u,this._w=l*h*u+f*p*x;break;case"ZXY":this._x=f*h*u-l*p*x,this._y=l*p*u+f*h*x,this._z=l*h*x+f*p*u,this._w=l*h*u-f*p*x;break;case"ZYX":this._x=f*h*u-l*p*x,this._y=l*p*u+f*h*x,this._z=l*h*x-f*p*u,this._w=l*h*u+f*p*x;break;case"YZX":this._x=f*h*u+l*p*x,this._y=l*p*u+f*h*x,this._z=l*h*x-f*p*u,this._w=l*h*u-f*p*x;break;case"XZY":this._x=f*h*u-l*p*x,this._y=l*p*u-f*h*x,this._z=l*h*x+f*p*u,this._w=l*h*u+f*p*x;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],f=n+a+u;if(f>0){let p=.5/Math.sqrt(f+1);this._w=.25/p,this._x=(h-c)*p,this._y=(r-l)*p,this._z=(o-s)*p}else if(n>a&&n>u){let p=2*Math.sqrt(1+n-a-u);this._w=(h-c)/p,this._x=.25*p,this._y=(s+o)/p,this._z=(r+l)/p}else if(a>u){let p=2*Math.sqrt(1+a-n-u);this._w=(r-l)/p,this._x=(s+o)/p,this._y=.25*p,this._z=(c+h)/p}else{let p=2*Math.sqrt(1+u-n-a);this._w=(o-s)/p,this._x=(r+l)/p,this._y=(c+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Kt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+o*a+s*l-r*c,this._y=s*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-s*a,this._w=o*h-n*a-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,s=this._y,r=this._z,o=this._w,a=o*e._w+n*e._x+s*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=s,this._z=r,this;let c=1-a*a;if(c<=Number.EPSILON){let p=1-t;return this._w=p*o+t*this._w,this._x=p*n+t*this._x,this._y=p*s+t*this._y,this._z=p*r+t*this._z,this.normalize(),this}let l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,f=Math.sin(t*h)/l;return this._w=o*u+this._w*f,this._x=n*u+this._x*f,this._y=s*u+this._y*f,this._z=r*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=Math.random(),t=Math.sqrt(1-e),n=Math.sqrt(e),s=2*Math.PI*Math.random(),r=2*Math.PI*Math.random();return this.set(t*Math.cos(s),n*Math.sin(r),n*Math.cos(r),t*Math.sin(s))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(cl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(cl.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*s-a*n),h=2*(a*t-r*s),u=2*(r*n-o*t);return this.x=t+c*l+o*u-a*h,this.y=n+c*h+a*l-r*u,this.z=s+c*u+r*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=s*c-r*a,this.y=r*o-n*c,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Da.copy(this).projectOnVector(e),this.sub(Da)}reflect(e){return this.sub(Da.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Kt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,n=Math.sqrt(1-e**2);return this.x=n*Math.cos(t),this.y=n*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Da=new D,cl=new li,Pi=class{constructor(e=new D(1/0,1/0,1/0),t=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(bn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(bn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=bn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,bn):bn.fromBufferAttribute(r,o),bn.applyMatrix4(e.matrixWorld),this.expandByPoint(bn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),nr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),nr.copy(n.boundingBox)),nr.applyMatrix4(e.matrixWorld),this.union(nr)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,bn),bn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Rs),ir.subVectors(this.max,Rs),Vi.subVectors(e.a,Rs),Gi.subVectors(e.b,Rs),ki.subVectors(e.c,Rs),Kn.subVectors(Gi,Vi),jn.subVectors(ki,Gi),vi.subVectors(Vi,ki);let t=[0,-Kn.z,Kn.y,0,-jn.z,jn.y,0,-vi.z,vi.y,Kn.z,0,-Kn.x,jn.z,0,-jn.x,vi.z,0,-vi.x,-Kn.y,Kn.x,0,-jn.y,jn.x,0,-vi.y,vi.x,0];return!Ua(t,Vi,Gi,ki,ir)||(t=[1,0,0,0,1,0,0,0,1],!Ua(t,Vi,Gi,ki,ir))?!1:(sr.crossVectors(Kn,jn),t=[sr.x,sr.y,sr.z],Ua(t,Vi,Gi,ki,ir))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,bn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(bn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Fn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Fn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Fn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Fn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Fn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Fn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Fn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Fn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Fn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Fn=[new D,new D,new D,new D,new D,new D,new D,new D],bn=new D,nr=new Pi,Vi=new D,Gi=new D,ki=new D,Kn=new D,jn=new D,vi=new D,Rs=new D,ir=new D,sr=new D,Mi=new D;function Ua(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Mi.fromArray(i,r);let a=s.x*Math.abs(Mi.x)+s.y*Math.abs(Mi.y)+s.z*Math.abs(Mi.z),c=e.dot(Mi),l=t.dot(Mi),h=n.dot(Mi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}var Zu=new Pi,Cs=new D,Na=new D,Bs=class{constructor(e=new D,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Zu.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Cs.subVectors(e,this.center);let t=Cs.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Cs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Na.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Cs.copy(e.center).add(Na)),this.expandByPoint(Cs.copy(e.center).sub(Na))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Bn=new D,Oa=new D,rr=new D,Qn=new D,Fa=new D,ar=new D,Ba=new D,Or=class{constructor(e=new D,t=new D(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Bn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Bn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Bn.copy(this.origin).addScaledVector(this.direction,t),Bn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Oa.copy(e).add(t).multiplyScalar(.5),rr.copy(t).sub(e).normalize(),Qn.copy(this.origin).sub(Oa);let r=e.distanceTo(t)*.5,o=-this.direction.dot(rr),a=Qn.dot(this.direction),c=-Qn.dot(rr),l=Qn.lengthSq(),h=Math.abs(1-o*o),u,f,p,x;if(h>0)if(u=o*c-a,f=o*a-c,x=r*h,u>=0)if(f>=-x)if(f<=x){let M=1/h;u*=M,f*=M,p=u*(u+o*f+2*a)+f*(o*u+f+2*c)+l}else f=r,u=Math.max(0,-(o*f+a)),p=-u*u+f*(f+2*c)+l;else f=-r,u=Math.max(0,-(o*f+a)),p=-u*u+f*(f+2*c)+l;else f<=-x?(u=Math.max(0,-(-o*r+a)),f=u>0?-r:Math.min(Math.max(-r,-c),r),p=-u*u+f*(f+2*c)+l):f<=x?(u=0,f=Math.min(Math.max(-r,-c),r),p=f*(f+2*c)+l):(u=Math.max(0,-(o*r+a)),f=u>0?r:Math.min(Math.max(-r,-c),r),p=-u*u+f*(f+2*c)+l);else f=o>0?-r:r,u=Math.max(0,-(o*f+a)),p=-u*u+f*(f+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Oa).addScaledVector(rr,f),p}intersectSphere(e,t){Bn.subVectors(e.center,this.origin);let n=Bn.dot(this.direction),s=Bn.dot(Bn)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(n=(e.min.x-f.x)*l,s=(e.max.x-f.x)*l):(n=(e.max.x-f.x)*l,s=(e.min.x-f.x)*l),h>=0?(r=(e.min.y-f.y)*h,o=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,o=(e.min.y-f.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(e.min.z-f.z)*u,c=(e.max.z-f.z)*u):(a=(e.max.z-f.z)*u,c=(e.min.z-f.z)*u),n>c||a>s)||((a>n||n!==n)&&(n=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Bn)!==null}intersectTriangle(e,t,n,s,r){Fa.subVectors(t,e),ar.subVectors(n,e),Ba.crossVectors(Fa,ar);let o=this.direction.dot(Ba),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Qn.subVectors(this.origin,e);let c=a*this.direction.dot(ar.crossVectors(Qn,ar));if(c<0)return null;let l=a*this.direction.dot(Fa.cross(Qn));if(l<0||c+l>o)return null;let h=-a*Qn.dot(Ba);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Gt=class i{constructor(e,t,n,s,r,o,a,c,l,h,u,f,p,x,M,m){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,c,l,h,u,f,p,x,M,m)}set(e,t,n,s,r,o,a,c,l,h,u,f,p,x,M,m){let d=this.elements;return d[0]=e,d[4]=t,d[8]=n,d[12]=s,d[1]=r,d[5]=o,d[9]=a,d[13]=c,d[2]=l,d[6]=h,d[10]=u,d[14]=f,d[3]=p,d[7]=x,d[11]=M,d[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,s=1/Wi.setFromMatrixColumn(e,0).length(),r=1/Wi.setFromMatrixColumn(e,1).length(),o=1/Wi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let f=o*h,p=o*u,x=a*h,M=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=p+x*l,t[5]=f-M*l,t[9]=-a*c,t[2]=M-f*l,t[6]=x+p*l,t[10]=o*c}else if(e.order==="YXZ"){let f=c*h,p=c*u,x=l*h,M=l*u;t[0]=f+M*a,t[4]=x*a-p,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=p*a-x,t[6]=M+f*a,t[10]=o*c}else if(e.order==="ZXY"){let f=c*h,p=c*u,x=l*h,M=l*u;t[0]=f-M*a,t[4]=-o*u,t[8]=x+p*a,t[1]=p+x*a,t[5]=o*h,t[9]=M-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){let f=o*h,p=o*u,x=a*h,M=a*u;t[0]=c*h,t[4]=x*l-p,t[8]=f*l+M,t[1]=c*u,t[5]=M*l+f,t[9]=p*l-x,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){let f=o*c,p=o*l,x=a*c,M=a*l;t[0]=c*h,t[4]=M-f*u,t[8]=x*u+p,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=p*u+x,t[10]=f-M*u}else if(e.order==="XZY"){let f=o*c,p=o*l,x=a*c,M=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=f*u+M,t[5]=o*h,t[9]=p*u-x,t[2]=x*u-p,t[6]=a*h,t[10]=M*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ju,e,$u)}lookAt(e,t,n){let s=this.elements;return dn.subVectors(e,t),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),ei.crossVectors(n,dn),ei.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),ei.crossVectors(n,dn)),ei.normalize(),or.crossVectors(dn,ei),s[0]=ei.x,s[4]=or.x,s[8]=dn.x,s[1]=ei.y,s[5]=or.y,s[9]=dn.y,s[2]=ei.z,s[6]=or.z,s[10]=dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],u=n[5],f=n[9],p=n[13],x=n[2],M=n[6],m=n[10],d=n[14],E=n[3],y=n[7],C=n[11],U=n[15],T=s[0],P=s[4],z=s[8],b=s[12],R=s[1],G=s[5],$=s[9],ue=s[13],N=s[2],H=s[6],K=s[10],ee=s[14],Q=s[3],j=s[7],le=s[11],he=s[15];return r[0]=o*T+a*R+c*N+l*Q,r[4]=o*P+a*G+c*H+l*j,r[8]=o*z+a*$+c*K+l*le,r[12]=o*b+a*ue+c*ee+l*he,r[1]=h*T+u*R+f*N+p*Q,r[5]=h*P+u*G+f*H+p*j,r[9]=h*z+u*$+f*K+p*le,r[13]=h*b+u*ue+f*ee+p*he,r[2]=x*T+M*R+m*N+d*Q,r[6]=x*P+M*G+m*H+d*j,r[10]=x*z+M*$+m*K+d*le,r[14]=x*b+M*ue+m*ee+d*he,r[3]=E*T+y*R+C*N+U*Q,r[7]=E*P+y*G+C*H+U*j,r[11]=E*z+y*$+C*K+U*le,r[15]=E*b+y*ue+C*ee+U*he,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],f=e[10],p=e[14],x=e[3],M=e[7],m=e[11],d=e[15];return x*(+r*c*u-s*l*u-r*a*f+n*l*f+s*a*p-n*c*p)+M*(+t*c*p-t*l*f+r*o*f-s*o*p+s*l*h-r*c*h)+m*(+t*l*u-t*a*p-r*o*u+n*o*p+r*a*h-n*l*h)+d*(-s*a*h-t*c*u+t*a*f+s*o*u-n*o*f+n*c*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],f=e[10],p=e[11],x=e[12],M=e[13],m=e[14],d=e[15],E=u*m*l-M*f*l+M*c*p-a*m*p-u*c*d+a*f*d,y=x*f*l-h*m*l-x*c*p+o*m*p+h*c*d-o*f*d,C=h*M*l-x*u*l+x*a*p-o*M*p-h*a*d+o*u*d,U=x*u*c-h*M*c-x*a*f+o*M*f+h*a*m-o*u*m,T=t*E+n*y+s*C+r*U;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let P=1/T;return e[0]=E*P,e[1]=(M*f*r-u*m*r-M*s*p+n*m*p+u*s*d-n*f*d)*P,e[2]=(a*m*r-M*c*r+M*s*l-n*m*l-a*s*d+n*c*d)*P,e[3]=(u*c*r-a*f*r-u*s*l+n*f*l+a*s*p-n*c*p)*P,e[4]=y*P,e[5]=(h*m*r-x*f*r+x*s*p-t*m*p-h*s*d+t*f*d)*P,e[6]=(x*c*r-o*m*r-x*s*l+t*m*l+o*s*d-t*c*d)*P,e[7]=(o*f*r-h*c*r+h*s*l-t*f*l-o*s*p+t*c*p)*P,e[8]=C*P,e[9]=(x*u*r-h*M*r-x*n*p+t*M*p+h*n*d-t*u*d)*P,e[10]=(o*M*r-x*a*r+x*n*l-t*M*l-o*n*d+t*a*d)*P,e[11]=(h*a*r-o*u*r-h*n*l+t*u*l+o*n*p-t*a*p)*P,e[12]=U*P,e[13]=(h*M*s-x*u*s+x*n*f-t*M*f-h*n*m+t*u*m)*P,e[14]=(x*a*s-o*M*s-x*n*c+t*M*c+o*n*m-t*a*m)*P,e[15]=(o*u*s-h*a*s+h*n*c-t*u*c-o*n*f+t*a*f)*P,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,c=e.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-s*c,l*c+s*a,0,l*a+s*c,h*a+n,h*c-s*o,0,l*c-s*a,h*c+s*o,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,h=o+o,u=a+a,f=r*l,p=r*h,x=r*u,M=o*h,m=o*u,d=a*u,E=c*l,y=c*h,C=c*u,U=n.x,T=n.y,P=n.z;return s[0]=(1-(M+d))*U,s[1]=(p+C)*U,s[2]=(x-y)*U,s[3]=0,s[4]=(p-C)*T,s[5]=(1-(f+d))*T,s[6]=(m+E)*T,s[7]=0,s[8]=(x+y)*P,s[9]=(m-E)*P,s[10]=(1-(f+M))*P,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements,r=Wi.set(s[0],s[1],s[2]).length(),o=Wi.set(s[4],s[5],s[6]).length(),a=Wi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],wn.copy(this);let l=1/r,h=1/o,u=1/a;return wn.elements[0]*=l,wn.elements[1]*=l,wn.elements[2]*=l,wn.elements[4]*=h,wn.elements[5]*=h,wn.elements[6]*=h,wn.elements[8]*=u,wn.elements[9]*=u,wn.elements[10]*=u,t.setFromRotationMatrix(wn),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,s,r,o,a=Wn){let c=this.elements,l=2*r/(t-e),h=2*r/(n-s),u=(t+e)/(t-e),f=(n+s)/(n-s),p,x;if(a===Wn)p=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===Lr)p=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=Wn){let c=this.elements,l=1/(t-e),h=1/(n-s),u=1/(o-r),f=(t+e)*l,p=(n+s)*h,x,M;if(a===Wn)x=(o+r)*u,M=-2*u;else if(a===Lr)x=r*u,M=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-f,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-p,c[2]=0,c[6]=0,c[10]=M,c[14]=-x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Wi=new D,wn=new Gt,Ju=new D(0,0,0),$u=new D(1,1,1),ei=new D,or=new D,dn=new D,ll=new Gt,hl=new li,Fr=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],h=s[9],u=s[2],f=s[6],p=s[10];switch(t){case"XYZ":this._y=Math.asin(Kt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Kt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Kt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Kt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,p),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Kt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Kt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ll.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ll,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return hl.setFromEuler(this),this.setFromQuaternion(hl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Fr.DEFAULT_ORDER="XYZ";var Hs=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Ku=0,ul=new D,Xi=new li,Hn=new Gt,cr=new D,Ps=new D,ju=new D,Qu=new li,dl=new D(1,0,0),fl=new D(0,1,0),pl=new D(0,0,1),ed={type:"added"},td={type:"removed"},an=class i extends ci{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ku++}),this.uuid=qs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new D,t=new Fr,n=new li,s=new D(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Gt},normalMatrix:{value:new pt}}),this.matrix=new Gt,this.matrixWorld=new Gt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Hs,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.multiply(Xi),this}rotateOnWorldAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.premultiply(Xi),this}rotateX(e){return this.rotateOnAxis(dl,e)}rotateY(e){return this.rotateOnAxis(fl,e)}rotateZ(e){return this.rotateOnAxis(pl,e)}translateOnAxis(e,t){return ul.copy(e).applyQuaternion(this.quaternion),this.position.add(ul.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(dl,e)}translateY(e){return this.translateOnAxis(fl,e)}translateZ(e){return this.translateOnAxis(pl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Hn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?cr.copy(e):cr.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Ps.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Hn.lookAt(Ps,cr,this.up):Hn.lookAt(cr,Ps,this.up),this.quaternion.setFromRotationMatrix(Hn),s&&(Hn.extractRotation(s.matrixWorld),Xi.setFromRotationMatrix(Hn),this.quaternion.premultiply(Xi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(ed)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(td)),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Hn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Hn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Hn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ps,e,ju),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ps,Qu,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++){let r=t[n];(r.matrixWorldAutoUpdate===!0||e===!0)&&r.updateMatrixWorld(e)}}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){let s=this.children;for(let r=0,o=s.length;r<o;r++){let a=s[r];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),s.maxGeometryCount=this._maxGeometryCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];s.animations.push(r(e.animations,c))}}if(t){let a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),f=o(e.skeletons),p=o(e.animations),x=o(e.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),p.length>0&&(n.animations=p),x.length>0&&(n.nodes=x)}return n.object=s,n;function o(a){let c=[];for(let l in a){let h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};an.DEFAULT_UP=new D(0,1,0);an.DEFAULT_MATRIX_AUTO_UPDATE=!0;an.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Tn=new D,zn=new D,Ha=new D,Vn=new D,qi=new D,Yi=new D,ml=new D,za=new D,Va=new D,Ga=new D,lr=!1,ts=class i{constructor(e=new D,t=new D,n=new D){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Tn.subVectors(e,t),s.cross(Tn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Tn.subVectors(s,t),zn.subVectors(n,t),Ha.subVectors(e,t);let o=Tn.dot(Tn),a=Tn.dot(zn),c=Tn.dot(Ha),l=zn.dot(zn),h=zn.dot(Ha),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;let f=1/u,p=(l*c-a*h)*f,x=(o*h-a*c)*f;return r.set(1-p-x,x,p)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Vn)===null?!1:Vn.x>=0&&Vn.y>=0&&Vn.x+Vn.y<=1}static getUV(e,t,n,s,r,o,a,c){return lr===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),lr=!0),this.getInterpolation(e,t,n,s,r,o,a,c)}static getInterpolation(e,t,n,s,r,o,a,c){return this.getBarycoord(e,t,n,s,Vn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Vn.x),c.addScaledVector(o,Vn.y),c.addScaledVector(a,Vn.z),c)}static isFrontFacing(e,t,n,s){return Tn.subVectors(n,t),zn.subVectors(e,t),Tn.cross(zn).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Tn.subVectors(this.c,this.b),zn.subVectors(this.a,this.b),Tn.cross(zn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,n,s,r){return lr===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),lr=!0),i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;qi.subVectors(s,n),Yi.subVectors(r,n),za.subVectors(e,n);let c=qi.dot(za),l=Yi.dot(za);if(c<=0&&l<=0)return t.copy(n);Va.subVectors(e,s);let h=qi.dot(Va),u=Yi.dot(Va);if(h>=0&&u<=h)return t.copy(s);let f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(n).addScaledVector(qi,o);Ga.subVectors(e,r);let p=qi.dot(Ga),x=Yi.dot(Ga);if(x>=0&&p<=x)return t.copy(r);let M=p*l-c*x;if(M<=0&&l>=0&&x<=0)return a=l/(l-x),t.copy(n).addScaledVector(Yi,a);let m=h*x-p*u;if(m<=0&&u-h>=0&&p-x>=0)return ml.subVectors(r,s),a=(u-h)/(u-h+(p-x)),t.copy(s).addScaledVector(ml,a);let d=1/(m+M+f);return o=M*d,a=f*d,t.copy(n).addScaledVector(qi,o).addScaledVector(Yi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},ah={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ti={h:0,s:0,l:0},hr={h:0,s:0,l:0};function ka(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var qe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=$t){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,wt.toWorkingColorSpace(this,t),this}setRGB(e,t,n,s=wt.workingColorSpace){return this.r=e,this.g=t,this.b=n,wt.toWorkingColorSpace(this,s),this}setHSL(e,t,n,s=wt.workingColorSpace){if(e=ku(e,1),t=Kt(t,0,1),n=Kt(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=ka(o,r,e+1/3),this.g=ka(o,r,e),this.b=ka(o,r,e-1/3)}return wt.toWorkingColorSpace(this,s),this}setStyle(e,t=$t){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=$t){let n=ah[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=rs(e.r),this.g=rs(e.g),this.b=rs(e.b),this}copyLinearToSRGB(e){return this.r=La(e.r),this.g=La(e.g),this.b=La(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=$t){return wt.fromWorkingColorSpace(en.copy(this),e),Math.round(Kt(en.r*255,0,255))*65536+Math.round(Kt(en.g*255,0,255))*256+Math.round(Kt(en.b*255,0,255))}getHexString(e=$t){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=wt.workingColorSpace){wt.fromWorkingColorSpace(en.copy(this),t);let n=en.r,s=en.g,r=en.b,o=Math.max(n,s,r),a=Math.min(n,s,r),c,l,h=(a+o)/2;if(a===o)c=0,l=0;else{let u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=wt.workingColorSpace){return wt.fromWorkingColorSpace(en.copy(this),t),e.r=en.r,e.g=en.g,e.b=en.b,e}getStyle(e=$t){wt.fromWorkingColorSpace(en.copy(this),e);let t=en.r,n=en.g,s=en.b;return e!==$t?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(ti),this.setHSL(ti.h+e,ti.s+t,ti.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ti),e.getHSL(hr);let n=Ca(ti.h,hr.h,t),s=Ca(ti.s,hr.s,t),r=Ca(ti.l,hr.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},en=new qe;qe.NAMES=ah;var nd=0,Li=class extends ci{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:nd++}),this.uuid=qs(),this.name="",this.type="Material",this.blending=ss,this.side=oi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=no,this.blendDst=io,this.blendEquation=wi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new qe(0,0,0),this.blendAlpha=0,this.depthFunc=wr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=tl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Hi,this.stencilZFail=Hi,this.stencilZPass=Hi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ss&&(n.blending=this.blending),this.side!==oi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==no&&(n.blendSrc=this.blendSrc),this.blendDst!==io&&(n.blendDst=this.blendDst),this.blendEquation!==wi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==wr&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==tl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Hi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Hi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Hi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let c=r[a];delete c.metadata,o.push(c)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},mn=class extends Li{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Yl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var zt=new D,ur=new we,yn=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=nl,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=ii,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ur.fromBufferAttribute(this,t),ur.applyMatrix3(e),this.setXY(t,ur.x,ur.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)zt.fromBufferAttribute(this,t),zt.applyMatrix3(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)zt.fromBufferAttribute(this,t),zt.applyMatrix4(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)zt.fromBufferAttribute(this,t),zt.applyNormalMatrix(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)zt.fromBufferAttribute(this,t),zt.transformDirection(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=As(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ln(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=As(t,this.array)),t}setX(e,t){return this.normalized&&(t=ln(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=As(t,this.array)),t}setY(e,t){return this.normalized&&(t=ln(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=As(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ln(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=As(t,this.array)),t}setW(e,t){return this.normalized&&(t=ln(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=ln(t,this.array),n=ln(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=ln(t,this.array),n=ln(n,this.array),s=ln(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=ln(t,this.array),n=ln(n,this.array),s=ln(s,this.array),r=ln(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==nl&&(e.usage=this.usage),e}};var Br=class extends yn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Hr=class extends yn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Et=class extends yn{constructor(e,t,n){super(new Float32Array(e),t,n)}};var id=0,gn=new Gt,Wa=new an,Zi=new D,fn=new Pi,Ls=new Pi,Yt=new D,on=class i extends ci{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:id++}),this.uuid=qs(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(rh(e)?Hr:Br)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new pt().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return gn.makeRotationFromQuaternion(e),this.applyMatrix4(gn),this}rotateX(e){return gn.makeRotationX(e),this.applyMatrix4(gn),this}rotateY(e){return gn.makeRotationY(e),this.applyMatrix4(gn),this}rotateZ(e){return gn.makeRotationZ(e),this.applyMatrix4(gn),this}translate(e,t,n){return gn.makeTranslation(e,t,n),this.applyMatrix4(gn),this}scale(e,t,n){return gn.makeScale(e,t,n),this.applyMatrix4(gn),this}lookAt(e){return Wa.lookAt(e),Wa.updateMatrix(),this.applyMatrix4(Wa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Zi).negate(),this.translate(Zi.x,Zi.y,Zi.z),this}setFromPoints(e){let t=[];for(let n=0,s=e.length;n<s;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}return this.setAttribute("position",new Et(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Pi);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];fn.setFromBufferAttribute(r),this.morphTargetsRelative?(Yt.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(Yt),Yt.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(Yt)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Bs);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new D,1/0);return}if(e){let n=this.boundingSphere.center;if(fn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];Ls.setFromBufferAttribute(a),this.morphTargetsRelative?(Yt.addVectors(fn.min,Ls.min),fn.expandByPoint(Yt),Yt.addVectors(fn.max,Ls.max),fn.expandByPoint(Yt)):(fn.expandByPoint(Ls.min),fn.expandByPoint(Ls.max))}fn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Yt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Yt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Yt.fromBufferAttribute(a,l),c&&(Zi.fromBufferAttribute(e,l),Yt.add(Zi)),s=Math.max(s,n.distanceToSquared(Yt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.array,s=t.position.array,r=t.normal.array,o=t.uv.array,a=s.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new yn(new Float32Array(4*a),4));let c=this.getAttribute("tangent").array,l=[],h=[];for(let R=0;R<a;R++)l[R]=new D,h[R]=new D;let u=new D,f=new D,p=new D,x=new we,M=new we,m=new we,d=new D,E=new D;function y(R,G,$){u.fromArray(s,R*3),f.fromArray(s,G*3),p.fromArray(s,$*3),x.fromArray(o,R*2),M.fromArray(o,G*2),m.fromArray(o,$*2),f.sub(u),p.sub(u),M.sub(x),m.sub(x);let ue=1/(M.x*m.y-m.x*M.y);isFinite(ue)&&(d.copy(f).multiplyScalar(m.y).addScaledVector(p,-M.y).multiplyScalar(ue),E.copy(p).multiplyScalar(M.x).addScaledVector(f,-m.x).multiplyScalar(ue),l[R].add(d),l[G].add(d),l[$].add(d),h[R].add(E),h[G].add(E),h[$].add(E))}let C=this.groups;C.length===0&&(C=[{start:0,count:n.length}]);for(let R=0,G=C.length;R<G;++R){let $=C[R],ue=$.start,N=$.count;for(let H=ue,K=ue+N;H<K;H+=3)y(n[H+0],n[H+1],n[H+2])}let U=new D,T=new D,P=new D,z=new D;function b(R){P.fromArray(r,R*3),z.copy(P);let G=l[R];U.copy(G),U.sub(P.multiplyScalar(P.dot(G))).normalize(),T.crossVectors(z,G);let ue=T.dot(h[R])<0?-1:1;c[R*4]=U.x,c[R*4+1]=U.y,c[R*4+2]=U.z,c[R*4+3]=ue}for(let R=0,G=C.length;R<G;++R){let $=C[R],ue=$.start,N=$.count;for(let H=ue,K=ue+N;H<K;H+=3)b(n[H+0]),b(n[H+1]),b(n[H+2])}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new yn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,p=n.count;f<p;f++)n.setXYZ(f,0,0,0);let s=new D,r=new D,o=new D,a=new D,c=new D,l=new D,h=new D,u=new D;if(e)for(let f=0,p=e.count;f<p;f+=3){let x=e.getX(f+0),M=e.getX(f+1),m=e.getX(f+2);s.fromBufferAttribute(t,x),r.fromBufferAttribute(t,M),o.fromBufferAttribute(t,m),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,x),c.fromBufferAttribute(n,M),l.fromBufferAttribute(n,m),a.add(h),c.add(h),l.add(h),n.setXYZ(x,a.x,a.y,a.z),n.setXYZ(M,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let f=0,p=t.count;f<p;f+=3)s.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Yt.fromBufferAttribute(e,t),Yt.normalize(),e.setXYZ(t,Yt.x,Yt.y,Yt.z)}toNonIndexed(){function e(a,c){let l=a.array,h=a.itemSize,u=a.normalized,f=new l.constructor(c.length*h),p=0,x=0;for(let M=0,m=c.length;M<m;M++){a.isInterleavedBufferAttribute?p=c[M]*a.data.stride+a.offset:p=c[M]*h;for(let d=0;d<h;d++)f[x++]=l[p++]}return new yn(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let a in s){let c=s[a],l=e(c,n);t.setAttribute(a,l)}let r=this.morphAttributes;for(let a in r){let c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){let f=l[h],p=e(f,n);c.push(p)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){let p=l[u];h.push(p.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],u=r[l];for(let f=0,p=u.length;f<p;f++)h.push(u[f].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let l=0,h=o.length;l<h;l++){let u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},gl=new Gt,Ei=new Or,dr=new Bs,_l=new D,Ji=new D,$i=new D,Ki=new D,Xa=new D,fr=new D,pr=new we,mr=new we,gr=new we,xl=new D,yl=new D,vl=new D,_r=new D,xr=new D,V=class extends an{constructor(e=new on,t=new mn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){fr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=a[c],u=r[c];h!==0&&(Xa.fromBufferAttribute(u,e),o?fr.addScaledVector(Xa,h):fr.addScaledVector(Xa.sub(t),h))}t.add(fr)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),dr.copy(n.boundingSphere),dr.applyMatrix4(r),Ei.copy(e.ray).recast(e.near),!(dr.containsPoint(Ei.origin)===!1&&(Ei.intersectSphere(dr,_l)===null||Ei.origin.distanceToSquared(_l)>(e.far-e.near)**2))&&(gl.copy(r).invert(),Ei.copy(e.ray).applyMatrix4(gl),!(n.boundingBox!==null&&Ei.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ei)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,p=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,M=f.length;x<M;x++){let m=f[x],d=o[m.materialIndex],E=Math.max(m.start,p.start),y=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let C=E,U=y;C<U;C+=3){let T=a.getX(C),P=a.getX(C+1),z=a.getX(C+2);s=yr(this,d,e,n,l,h,u,T,P,z),s&&(s.faceIndex=Math.floor(C/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let x=Math.max(0,p.start),M=Math.min(a.count,p.start+p.count);for(let m=x,d=M;m<d;m+=3){let E=a.getX(m),y=a.getX(m+1),C=a.getX(m+2);s=yr(this,o,e,n,l,h,u,E,y,C),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let x=0,M=f.length;x<M;x++){let m=f[x],d=o[m.materialIndex],E=Math.max(m.start,p.start),y=Math.min(c.count,Math.min(m.start+m.count,p.start+p.count));for(let C=E,U=y;C<U;C+=3){let T=C,P=C+1,z=C+2;s=yr(this,d,e,n,l,h,u,T,P,z),s&&(s.faceIndex=Math.floor(C/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let x=Math.max(0,p.start),M=Math.min(c.count,p.start+p.count);for(let m=x,d=M;m<d;m+=3){let E=m,y=m+1,C=m+2;s=yr(this,o,e,n,l,h,u,E,y,C),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function sd(i,e,t,n,s,r,o,a){let c;if(e.side===hn?c=n.intersectTriangle(o,r,s,!0,a):c=n.intersectTriangle(s,r,o,e.side===oi,a),c===null)return null;xr.copy(a),xr.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(xr);return l<t.near||l>t.far?null:{distance:l,point:xr.clone(),object:i}}function yr(i,e,t,n,s,r,o,a,c,l){i.getVertexPosition(a,Ji),i.getVertexPosition(c,$i),i.getVertexPosition(l,Ki);let h=sd(i,e,t,n,Ji,$i,Ki,_r);if(h){s&&(pr.fromBufferAttribute(s,a),mr.fromBufferAttribute(s,c),gr.fromBufferAttribute(s,l),h.uv=ts.getInterpolation(_r,Ji,$i,Ki,pr,mr,gr,new we)),r&&(pr.fromBufferAttribute(r,a),mr.fromBufferAttribute(r,c),gr.fromBufferAttribute(r,l),h.uv1=ts.getInterpolation(_r,Ji,$i,Ki,pr,mr,gr,new we),h.uv2=h.uv1),o&&(xl.fromBufferAttribute(o,a),yl.fromBufferAttribute(o,c),vl.fromBufferAttribute(o,l),h.normal=ts.getInterpolation(_r,Ji,$i,Ki,xl,yl,vl,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:c,c:l,normal:new D,materialIndex:0};ts.getNormal(Ji,$i,Ki,u.normal),h.face=u}return h}var $e=class i extends on{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let c=[],l=[],h=[],u=[],f=0,p=0;x("z","y","x",-1,-1,n,t,e,o,r,0),x("z","y","x",1,-1,n,t,-e,o,r,1),x("x","z","y",1,1,e,n,t,s,o,2),x("x","z","y",1,-1,e,n,-t,s,o,3),x("x","y","z",1,-1,e,t,n,s,r,4),x("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new Et(l,3)),this.setAttribute("normal",new Et(h,3)),this.setAttribute("uv",new Et(u,2));function x(M,m,d,E,y,C,U,T,P,z,b){let R=C/P,G=U/z,$=C/2,ue=U/2,N=T/2,H=P+1,K=z+1,ee=0,Q=0,j=new D;for(let le=0;le<K;le++){let he=le*G-ue;for(let ve=0;ve<H;ve++){let J=ve*R-$;j[M]=J*E,j[m]=he*y,j[d]=N,l.push(j.x,j.y,j.z),j[M]=0,j[m]=0,j[d]=T>0?1:-1,h.push(j.x,j.y,j.z),u.push(ve/P),u.push(1-le/z),ee+=1}}for(let le=0;le<z;le++)for(let he=0;he<P;he++){let ve=f+he+H*le,J=f+he+H*(le+1),se=f+(he+1)+H*(le+1),ye=f+(he+1)+H*le;c.push(ve,J,ye),c.push(J,se,ye),Q+=6}a.addGroup(p,Q,b),p+=Q,f+=ee}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function us(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function nn(i){let e={};for(let t=0;t<i.length;t++){let n=us(i[t]);for(let s in n)e[s]=n[s]}return e}function rd(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function oh(i){return i.getRenderTarget()===null?i.outputColorSpace:wt.workingColorSpace}var ad={clone:us,merge:nn},od=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,cd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Yn=class extends Li{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=od,this.fragmentShader=cd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=us(e.uniforms),this.uniformsGroups=rd(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},zr=class extends an{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Gt,this.projectionMatrix=new Gt,this.projectionMatrixInverse=new Gt,this.coordinateSystem=Wn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},rn=class extends zr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=co*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ra*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return co*2*Math.atan(Math.tan(Ra*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ra*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,t-=o.offsetY*n/l,s*=o.width/c,n*=o.height/l}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ji=-90,Qi=1,fo=class extends an{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new rn(ji,Qi,e,t);s.layers=this.layers,this.add(s);let r=new rn(ji,Qi,e,t);r.layers=this.layers,this.add(r);let o=new rn(ji,Qi,e,t);o.layers=this.layers,this.add(o);let a=new rn(ji,Qi,e,t);a.layers=this.layers,this.add(a);let c=new rn(ji,Qi,e,t);c.layers=this.layers,this.add(c);let l=new rn(ji,Qi,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,c]=t;for(let l of t)this.remove(l);if(e===Wn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Lr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,c,l,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),x=e.xr.enabled;e.xr.enabled=!1;let M=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,o),e.setRenderTarget(n,2,s),e.render(t,a),e.setRenderTarget(n,3,s),e.render(t,c),e.setRenderTarget(n,4,s),e.render(t,l),n.texture.generateMipmaps=M,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(u,f,p),e.xr.enabled=x,n.texture.needsPMREMUpdate=!0}},Vr=class extends vn{constructor(e,t,n,s,r,o,a,c,l,h){e=e!==void 0?e:[],t=t!==void 0?t:os,super(e,t,n,s,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},po=class extends qn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];t.encoding!==void 0&&(Is("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===Ci?$t:xn),this.texture=new Vr(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:_n}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new $e(5,5,5),r=new Yn({name:"CubemapFromEquirect",uniforms:us(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:hn,blending:si});r.uniforms.tEquirect.value=t;let o=new V(s,r),a=t.minFilter;return t.minFilter===Os&&(t.minFilter=_n),new fo(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t,n,s){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}},qa=new D,ld=new D,hd=new pt,kn=class{constructor(e=new D(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=qa.subVectors(n,t).cross(ld.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(qa),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||hd.getNormalMatrix(e),s=this.coplanarPoint(qa).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Si=new Bs,vr=new D,zs=class{constructor(e=new kn,t=new kn,n=new kn,s=new kn,r=new kn,o=new kn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Wn){let n=this.planes,s=e.elements,r=s[0],o=s[1],a=s[2],c=s[3],l=s[4],h=s[5],u=s[6],f=s[7],p=s[8],x=s[9],M=s[10],m=s[11],d=s[12],E=s[13],y=s[14],C=s[15];if(n[0].setComponents(c-r,f-l,m-p,C-d).normalize(),n[1].setComponents(c+r,f+l,m+p,C+d).normalize(),n[2].setComponents(c+o,f+h,m+x,C+E).normalize(),n[3].setComponents(c-o,f-h,m-x,C-E).normalize(),n[4].setComponents(c-a,f-u,m-M,C-y).normalize(),t===Wn)n[5].setComponents(c+a,f+u,m+M,C+y).normalize();else if(t===Lr)n[5].setComponents(a,u,M,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Si.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Si.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Si)}intersectsSprite(e){return Si.center.set(0,0,0),Si.radius=.7071067811865476,Si.applyMatrix4(e.matrixWorld),this.intersectsSphere(Si)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(vr.x=s.normal.x>0?e.max.x:e.min.x,vr.y=s.normal.y>0?e.max.y:e.min.y,vr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(vr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function ch(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function ud(i,e){let t=e.isWebGL2,n=new WeakMap;function s(l,h){let u=l.array,f=l.usage,p=u.byteLength,x=i.createBuffer();i.bindBuffer(h,x),i.bufferData(h,u,f),l.onUploadCallback();let M;if(u instanceof Float32Array)M=i.FLOAT;else if(u instanceof Uint16Array)if(l.isFloat16BufferAttribute)if(t)M=i.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else M=i.UNSIGNED_SHORT;else if(u instanceof Int16Array)M=i.SHORT;else if(u instanceof Uint32Array)M=i.UNSIGNED_INT;else if(u instanceof Int32Array)M=i.INT;else if(u instanceof Int8Array)M=i.BYTE;else if(u instanceof Uint8Array)M=i.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)M=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:x,type:M,bytesPerElement:u.BYTES_PER_ELEMENT,version:l.version,size:p}}function r(l,h,u){let f=h.array,p=h._updateRange,x=h.updateRanges;if(i.bindBuffer(u,l),p.count===-1&&x.length===0&&i.bufferSubData(u,0,f),x.length!==0){for(let M=0,m=x.length;M<m;M++){let d=x[M];t?i.bufferSubData(u,d.start*f.BYTES_PER_ELEMENT,f,d.start,d.count):i.bufferSubData(u,d.start*f.BYTES_PER_ELEMENT,f.subarray(d.start,d.start+d.count))}h.clearUpdateRanges()}p.count!==-1&&(t?i.bufferSubData(u,p.offset*f.BYTES_PER_ELEMENT,f,p.offset,p.count):i.bufferSubData(u,p.offset*f.BYTES_PER_ELEMENT,f.subarray(p.offset,p.offset+p.count)),p.count=-1),h.onUploadCallback()}function o(l){return l.isInterleavedBufferAttribute&&(l=l.data),n.get(l)}function a(l){l.isInterleavedBufferAttribute&&(l=l.data);let h=n.get(l);h&&(i.deleteBuffer(h.buffer),n.delete(l))}function c(l,h){if(l.isGLBufferAttribute){let f=n.get(l);(!f||f.version<l.version)&&n.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);let u=n.get(l);if(u===void 0)n.set(l,s(l,h));else if(u.version<l.version){if(u.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(u.buffer,l,h),u.version=l.version}}return{get:o,remove:a,update:c}}var hi=class i extends on{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),c=Math.floor(s),l=a+1,h=c+1,u=e/a,f=t/c,p=[],x=[],M=[],m=[];for(let d=0;d<h;d++){let E=d*f-o;for(let y=0;y<l;y++){let C=y*u-r;x.push(C,-E,0),M.push(0,0,1),m.push(y/a),m.push(1-d/c)}}for(let d=0;d<c;d++)for(let E=0;E<a;E++){let y=E+l*d,C=E+l*(d+1),U=E+1+l*(d+1),T=E+1+l*d;p.push(y,C,T),p.push(C,U,T)}this.setIndex(p),this.setAttribute("position",new Et(x,3)),this.setAttribute("normal",new Et(M,3)),this.setAttribute("uv",new Et(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},dd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,fd=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,pd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,md=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gd=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,_d=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,xd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,yd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,vd=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Md=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,Ed=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Sd=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,wd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Td=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ad=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,Rd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Cd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Pd=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ld=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Id=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Dd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Ud=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Nd=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Od=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Fd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Bd=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Hd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,zd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Gd="gl_FragColor = linearToOutputTexel( gl_FragColor );",kd=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Wd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Xd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,qd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Yd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Zd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Jd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,$d=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Kd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,jd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Qd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,ef=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,tf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,nf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,sf=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,rf=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,af=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,of=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,cf=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,hf=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,uf=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,df=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ff=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,pf=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,mf=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,gf=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,_f=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xf=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,yf=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,vf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Mf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Ef=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Sf=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,bf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,wf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Tf=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Af=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,Rf=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,Cf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,Pf=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Lf=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,If=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Df=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Uf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Nf=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Of=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ff=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Bf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Hf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Vf=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Gf=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,kf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Wf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Xf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,qf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Yf=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Zf=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,Jf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,$f=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Kf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,jf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Qf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,ep=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,tp=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,np=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ip=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rp=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ap=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,op=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,lp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,up=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,dp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,fp=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,mp=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,gp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,_p=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xp=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,yp=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,vp=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Mp=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Ep=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Sp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bp=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,wp=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Tp=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Ap=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rp=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cp=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pp=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Lp=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ip=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Dp=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Up=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Np=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Op=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Fp=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bp=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hp=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zp=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Vp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Gp=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,kp=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Wp=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Xp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ut={alphahash_fragment:dd,alphahash_pars_fragment:fd,alphamap_fragment:pd,alphamap_pars_fragment:md,alphatest_fragment:gd,alphatest_pars_fragment:_d,aomap_fragment:xd,aomap_pars_fragment:yd,batching_pars_vertex:vd,batching_vertex:Md,begin_vertex:Ed,beginnormal_vertex:Sd,bsdfs:bd,iridescence_fragment:wd,bumpmap_pars_fragment:Td,clipping_planes_fragment:Ad,clipping_planes_pars_fragment:Rd,clipping_planes_pars_vertex:Cd,clipping_planes_vertex:Pd,color_fragment:Ld,color_pars_fragment:Id,color_pars_vertex:Dd,color_vertex:Ud,common:Nd,cube_uv_reflection_fragment:Od,defaultnormal_vertex:Fd,displacementmap_pars_vertex:Bd,displacementmap_vertex:Hd,emissivemap_fragment:zd,emissivemap_pars_fragment:Vd,colorspace_fragment:Gd,colorspace_pars_fragment:kd,envmap_fragment:Wd,envmap_common_pars_fragment:Xd,envmap_pars_fragment:qd,envmap_pars_vertex:Yd,envmap_physical_pars_fragment:af,envmap_vertex:Zd,fog_vertex:Jd,fog_pars_vertex:$d,fog_fragment:Kd,fog_pars_fragment:jd,gradientmap_pars_fragment:Qd,lightmap_fragment:ef,lightmap_pars_fragment:tf,lights_lambert_fragment:nf,lights_lambert_pars_fragment:sf,lights_pars_begin:rf,lights_toon_fragment:of,lights_toon_pars_fragment:cf,lights_phong_fragment:lf,lights_phong_pars_fragment:hf,lights_physical_fragment:uf,lights_physical_pars_fragment:df,lights_fragment_begin:ff,lights_fragment_maps:pf,lights_fragment_end:mf,logdepthbuf_fragment:gf,logdepthbuf_pars_fragment:_f,logdepthbuf_pars_vertex:xf,logdepthbuf_vertex:yf,map_fragment:vf,map_pars_fragment:Mf,map_particle_fragment:Ef,map_particle_pars_fragment:Sf,metalnessmap_fragment:bf,metalnessmap_pars_fragment:wf,morphcolor_vertex:Tf,morphnormal_vertex:Af,morphtarget_pars_vertex:Rf,morphtarget_vertex:Cf,normal_fragment_begin:Pf,normal_fragment_maps:Lf,normal_pars_fragment:If,normal_pars_vertex:Df,normal_vertex:Uf,normalmap_pars_fragment:Nf,clearcoat_normal_fragment_begin:Of,clearcoat_normal_fragment_maps:Ff,clearcoat_pars_fragment:Bf,iridescence_pars_fragment:Hf,opaque_fragment:zf,packing:Vf,premultiplied_alpha_fragment:Gf,project_vertex:kf,dithering_fragment:Wf,dithering_pars_fragment:Xf,roughnessmap_fragment:qf,roughnessmap_pars_fragment:Yf,shadowmap_pars_fragment:Zf,shadowmap_pars_vertex:Jf,shadowmap_vertex:$f,shadowmask_pars_fragment:Kf,skinbase_vertex:jf,skinning_pars_vertex:Qf,skinning_vertex:ep,skinnormal_vertex:tp,specularmap_fragment:np,specularmap_pars_fragment:ip,tonemapping_fragment:sp,tonemapping_pars_fragment:rp,transmission_fragment:ap,transmission_pars_fragment:op,uv_pars_fragment:cp,uv_pars_vertex:lp,uv_vertex:hp,worldpos_vertex:up,background_vert:dp,background_frag:fp,backgroundCube_vert:pp,backgroundCube_frag:mp,cube_vert:gp,cube_frag:_p,depth_vert:xp,depth_frag:yp,distanceRGBA_vert:vp,distanceRGBA_frag:Mp,equirect_vert:Ep,equirect_frag:Sp,linedashed_vert:bp,linedashed_frag:wp,meshbasic_vert:Tp,meshbasic_frag:Ap,meshlambert_vert:Rp,meshlambert_frag:Cp,meshmatcap_vert:Pp,meshmatcap_frag:Lp,meshnormal_vert:Ip,meshnormal_frag:Dp,meshphong_vert:Up,meshphong_frag:Np,meshphysical_vert:Op,meshphysical_frag:Fp,meshtoon_vert:Bp,meshtoon_frag:Hp,points_vert:zp,points_frag:Vp,shadow_vert:Gp,shadow_frag:kp,sprite_vert:Wp,sprite_frag:Xp},ge={common:{diffuse:{value:new qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new qe(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},Dn={basic:{uniforms:nn([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:ut.meshbasic_vert,fragmentShader:ut.meshbasic_frag},lambert:{uniforms:nn([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new qe(0)}}]),vertexShader:ut.meshlambert_vert,fragmentShader:ut.meshlambert_frag},phong:{uniforms:nn([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new qe(0)},specular:{value:new qe(1118481)},shininess:{value:30}}]),vertexShader:ut.meshphong_vert,fragmentShader:ut.meshphong_frag},standard:{uniforms:nn([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ut.meshphysical_vert,fragmentShader:ut.meshphysical_frag},toon:{uniforms:nn([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new qe(0)}}]),vertexShader:ut.meshtoon_vert,fragmentShader:ut.meshtoon_frag},matcap:{uniforms:nn([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:ut.meshmatcap_vert,fragmentShader:ut.meshmatcap_frag},points:{uniforms:nn([ge.points,ge.fog]),vertexShader:ut.points_vert,fragmentShader:ut.points_frag},dashed:{uniforms:nn([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ut.linedashed_vert,fragmentShader:ut.linedashed_frag},depth:{uniforms:nn([ge.common,ge.displacementmap]),vertexShader:ut.depth_vert,fragmentShader:ut.depth_frag},normal:{uniforms:nn([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:ut.meshnormal_vert,fragmentShader:ut.meshnormal_frag},sprite:{uniforms:nn([ge.sprite,ge.fog]),vertexShader:ut.sprite_vert,fragmentShader:ut.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ut.background_vert,fragmentShader:ut.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:ut.backgroundCube_vert,fragmentShader:ut.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ut.cube_vert,fragmentShader:ut.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ut.equirect_vert,fragmentShader:ut.equirect_frag},distanceRGBA:{uniforms:nn([ge.common,ge.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ut.distanceRGBA_vert,fragmentShader:ut.distanceRGBA_frag},shadow:{uniforms:nn([ge.lights,ge.fog,{color:{value:new qe(0)},opacity:{value:1}}]),vertexShader:ut.shadow_vert,fragmentShader:ut.shadow_frag}};Dn.physical={uniforms:nn([Dn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new qe(0)},specularColor:{value:new qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:ut.meshphysical_vert,fragmentShader:ut.meshphysical_frag};var Mr={r:0,b:0,g:0};function qp(i,e,t,n,s,r,o){let a=new qe(0),c=r===!0?0:1,l,h,u=null,f=0,p=null;function x(m,d){let E=!1,y=d.isScene===!0?d.background:null;y&&y.isTexture&&(y=(d.backgroundBlurriness>0?t:e).get(y)),y===null?M(a,c):y&&y.isColor&&(M(y,1),E=!0);let C=i.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,o):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||E)&&i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil),y&&(y.isCubeTexture||y.mapping===ia)?(h===void 0&&(h=new V(new $e(1,1,1),new Yn({name:"BackgroundCubeMaterial",uniforms:us(Dn.backgroundCube.uniforms),vertexShader:Dn.backgroundCube.vertexShader,fragmentShader:Dn.backgroundCube.fragmentShader,side:hn,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(U,T,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),h.material.uniforms.envMap.value=y,h.material.uniforms.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=d.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,h.material.toneMapped=wt.getTransfer(y.colorSpace)!==Pt,(u!==y||f!==y.version||p!==i.toneMapping)&&(h.material.needsUpdate=!0,u=y,f=y.version,p=i.toneMapping),h.layers.enableAll(),m.unshift(h,h.geometry,h.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new V(new hi(2,2),new Yn({name:"BackgroundMaterial",uniforms:us(Dn.background.uniforms),vertexShader:Dn.background.vertexShader,fragmentShader:Dn.background.fragmentShader,side:oi,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,l.material.toneMapped=wt.getTransfer(y.colorSpace)!==Pt,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(u!==y||f!==y.version||p!==i.toneMapping)&&(l.material.needsUpdate=!0,u=y,f=y.version,p=i.toneMapping),l.layers.enableAll(),m.unshift(l,l.geometry,l.material,0,0,null))}function M(m,d){m.getRGB(Mr,oh(i)),n.buffers.color.setClear(Mr.r,Mr.g,Mr.b,d,o)}return{getClearColor:function(){return a},setClearColor:function(m,d=1){a.set(m),c=d,M(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(m){c=m,M(a,c)},render:x}}function Yp(i,e,t,n){let s=i.getParameter(i.MAX_VERTEX_ATTRIBS),r=n.isWebGL2?null:e.get("OES_vertex_array_object"),o=n.isWebGL2||r!==null,a={},c=m(null),l=c,h=!1;function u(N,H,K,ee,Q){let j=!1;if(o){let le=M(ee,K,H);l!==le&&(l=le,p(l.object)),j=d(N,ee,K,Q),j&&E(N,ee,K,Q)}else{let le=H.wireframe===!0;(l.geometry!==ee.id||l.program!==K.id||l.wireframe!==le)&&(l.geometry=ee.id,l.program=K.id,l.wireframe=le,j=!0)}Q!==null&&t.update(Q,i.ELEMENT_ARRAY_BUFFER),(j||h)&&(h=!1,z(N,H,K,ee),Q!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(Q).buffer))}function f(){return n.isWebGL2?i.createVertexArray():r.createVertexArrayOES()}function p(N){return n.isWebGL2?i.bindVertexArray(N):r.bindVertexArrayOES(N)}function x(N){return n.isWebGL2?i.deleteVertexArray(N):r.deleteVertexArrayOES(N)}function M(N,H,K){let ee=K.wireframe===!0,Q=a[N.id];Q===void 0&&(Q={},a[N.id]=Q);let j=Q[H.id];j===void 0&&(j={},Q[H.id]=j);let le=j[ee];return le===void 0&&(le=m(f()),j[ee]=le),le}function m(N){let H=[],K=[],ee=[];for(let Q=0;Q<s;Q++)H[Q]=0,K[Q]=0,ee[Q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:H,enabledAttributes:K,attributeDivisors:ee,object:N,attributes:{},index:null}}function d(N,H,K,ee){let Q=l.attributes,j=H.attributes,le=0,he=K.getAttributes();for(let ve in he)if(he[ve].location>=0){let se=Q[ve],ye=j[ve];if(ye===void 0&&(ve==="instanceMatrix"&&N.instanceMatrix&&(ye=N.instanceMatrix),ve==="instanceColor"&&N.instanceColor&&(ye=N.instanceColor)),se===void 0||se.attribute!==ye||ye&&se.data!==ye.data)return!0;le++}return l.attributesNum!==le||l.index!==ee}function E(N,H,K,ee){let Q={},j=H.attributes,le=0,he=K.getAttributes();for(let ve in he)if(he[ve].location>=0){let se=j[ve];se===void 0&&(ve==="instanceMatrix"&&N.instanceMatrix&&(se=N.instanceMatrix),ve==="instanceColor"&&N.instanceColor&&(se=N.instanceColor));let ye={};ye.attribute=se,se&&se.data&&(ye.data=se.data),Q[ve]=ye,le++}l.attributes=Q,l.attributesNum=le,l.index=ee}function y(){let N=l.newAttributes;for(let H=0,K=N.length;H<K;H++)N[H]=0}function C(N){U(N,0)}function U(N,H){let K=l.newAttributes,ee=l.enabledAttributes,Q=l.attributeDivisors;K[N]=1,ee[N]===0&&(i.enableVertexAttribArray(N),ee[N]=1),Q[N]!==H&&((n.isWebGL2?i:e.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](N,H),Q[N]=H)}function T(){let N=l.newAttributes,H=l.enabledAttributes;for(let K=0,ee=H.length;K<ee;K++)H[K]!==N[K]&&(i.disableVertexAttribArray(K),H[K]=0)}function P(N,H,K,ee,Q,j,le){le===!0?i.vertexAttribIPointer(N,H,K,Q,j):i.vertexAttribPointer(N,H,K,ee,Q,j)}function z(N,H,K,ee){if(n.isWebGL2===!1&&(N.isInstancedMesh||ee.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;y();let Q=ee.attributes,j=K.getAttributes(),le=H.defaultAttributeValues;for(let he in j){let ve=j[he];if(ve.location>=0){let J=Q[he];if(J===void 0&&(he==="instanceMatrix"&&N.instanceMatrix&&(J=N.instanceMatrix),he==="instanceColor"&&N.instanceColor&&(J=N.instanceColor)),J!==void 0){let se=J.normalized,ye=J.itemSize,Ie=t.get(J);if(Ie===void 0)continue;let De=Ie.buffer,et=Ie.type,Ke=Ie.bytesPerElement,Ge=n.isWebGL2===!0&&(et===i.INT||et===i.UNSIGNED_INT||J.gpuType===Jl);if(J.isInterleavedBufferAttribute){let ft=J.data,k=ft.stride,Ft=J.offset;if(ft.isInstancedInterleavedBuffer){for(let He=0;He<ve.locationSize;He++)U(ve.location+He,ft.meshPerAttribute);N.isInstancedMesh!==!0&&ee._maxInstanceCount===void 0&&(ee._maxInstanceCount=ft.meshPerAttribute*ft.count)}else for(let He=0;He<ve.locationSize;He++)C(ve.location+He);i.bindBuffer(i.ARRAY_BUFFER,De);for(let He=0;He<ve.locationSize;He++)P(ve.location+He,ye/ve.locationSize,et,se,k*Ke,(Ft+ye/ve.locationSize*He)*Ke,Ge)}else{if(J.isInstancedBufferAttribute){for(let ft=0;ft<ve.locationSize;ft++)U(ve.location+ft,J.meshPerAttribute);N.isInstancedMesh!==!0&&ee._maxInstanceCount===void 0&&(ee._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let ft=0;ft<ve.locationSize;ft++)C(ve.location+ft);i.bindBuffer(i.ARRAY_BUFFER,De);for(let ft=0;ft<ve.locationSize;ft++)P(ve.location+ft,ye/ve.locationSize,et,se,ye*Ke,ye/ve.locationSize*ft*Ke,Ge)}}else if(le!==void 0){let se=le[he];if(se!==void 0)switch(se.length){case 2:i.vertexAttrib2fv(ve.location,se);break;case 3:i.vertexAttrib3fv(ve.location,se);break;case 4:i.vertexAttrib4fv(ve.location,se);break;default:i.vertexAttrib1fv(ve.location,se)}}}}T()}function b(){$();for(let N in a){let H=a[N];for(let K in H){let ee=H[K];for(let Q in ee)x(ee[Q].object),delete ee[Q];delete H[K]}delete a[N]}}function R(N){if(a[N.id]===void 0)return;let H=a[N.id];for(let K in H){let ee=H[K];for(let Q in ee)x(ee[Q].object),delete ee[Q];delete H[K]}delete a[N.id]}function G(N){for(let H in a){let K=a[H];if(K[N.id]===void 0)continue;let ee=K[N.id];for(let Q in ee)x(ee[Q].object),delete ee[Q];delete K[N.id]}}function $(){ue(),h=!0,l!==c&&(l=c,p(l.object))}function ue(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:u,reset:$,resetDefaultState:ue,dispose:b,releaseStatesOfGeometry:R,releaseStatesOfProgram:G,initAttributes:y,enableAttribute:C,disableUnusedAttributes:T}}function Zp(i,e,t,n){let s=n.isWebGL2,r;function o(h){r=h}function a(h,u){i.drawArrays(r,h,u),t.update(u,r,1)}function c(h,u,f){if(f===0)return;let p,x;if(s)p=i,x="drawArraysInstanced";else if(p=e.get("ANGLE_instanced_arrays"),x="drawArraysInstancedANGLE",p===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[x](r,h,u,f),t.update(u,r,f)}function l(h,u,f){if(f===0)return;let p=e.get("WEBGL_multi_draw");if(p===null)for(let x=0;x<f;x++)this.render(h[x],u[x]);else{p.multiDrawArraysWEBGL(r,h,0,u,0,f);let x=0;for(let M=0;M<f;M++)x+=u[M];t.update(x,r,1)}}this.setMode=o,this.render=a,this.renderInstances=c,this.renderMultiDraw=l}function Jp(i,e,t){let n;function s(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){let P=e.get("EXT_texture_filter_anisotropic");n=i.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function r(P){if(P==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let o=typeof WebGL2RenderingContext<"u"&&i.constructor.name==="WebGL2RenderingContext",a=t.precision!==void 0?t.precision:"highp",c=r(a);c!==a&&(console.warn("THREE.WebGLRenderer:",a,"not supported, using",c,"instead."),a=c);let l=o||e.has("WEBGL_draw_buffers"),h=t.logarithmicDepthBuffer===!0,u=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),f=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),p=i.getParameter(i.MAX_TEXTURE_SIZE),x=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),M=i.getParameter(i.MAX_VERTEX_ATTRIBS),m=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),d=i.getParameter(i.MAX_VARYING_VECTORS),E=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),y=f>0,C=o||e.has("OES_texture_float"),U=y&&C,T=o?i.getParameter(i.MAX_SAMPLES):0;return{isWebGL2:o,drawBuffers:l,getMaxAnisotropy:s,getMaxPrecision:r,precision:a,logarithmicDepthBuffer:h,maxTextures:u,maxVertexTextures:f,maxTextureSize:p,maxCubemapSize:x,maxAttributes:M,maxVertexUniforms:m,maxVaryings:d,maxFragmentUniforms:E,vertexTextures:y,floatFragmentTextures:C,floatVertexTextures:U,maxSamples:T}}function $p(i){let e=this,t=null,n=0,s=!1,r=!1,o=new kn,a=new pt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){let p=u.length!==0||f||n!==0||s;return s=f,n=u.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,p){let x=u.clippingPlanes,M=u.clipIntersection,m=u.clipShadows,d=i.get(u);if(!s||x===null||x.length===0||r&&!m)r?h(null):l();else{let E=r?0:n,y=E*4,C=d.clippingState||null;c.value=C,C=h(x,f,y,p);for(let U=0;U!==y;++U)C[U]=t[U];d.clippingState=C,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=E}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,p,x){let M=u!==null?u.length:0,m=null;if(M!==0){if(m=c.value,x!==!0||m===null){let d=p+M*4,E=f.matrixWorldInverse;a.getNormalMatrix(E),(m===null||m.length<d)&&(m=new Float32Array(d));for(let y=0,C=p;y!==M;++y,C+=4)o.copy(u[y]).applyMatrix4(E,a),o.normal.toArray(m,C),m[C+3]=o.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=M,e.numIntersection=0,m}}function Kp(i){let e=new WeakMap;function t(o,a){return a===so?o.mapping=os:a===ro&&(o.mapping=cs),o}function n(o){if(o&&o.isTexture){let a=o.mapping;if(a===so||a===ro)if(e.has(o)){let c=e.get(o).texture;return t(c,o.mapping)}else{let c=o.image;if(c&&c.height>0){let l=new po(c.height/2);return l.fromEquirectangularTexture(i,o),e.set(o,l),o.addEventListener("dispose",s),t(l.texture,o.mapping)}else return null}}return o}function s(o){let a=o.target;a.removeEventListener("dispose",s);let c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}var Gr=class extends zr{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},ns=4,Ml=[.125,.215,.35,.446,.526,.582],Ti=20,Ya=new Gr,El=new qe,Za=null,Ja=0,$a=0,bi=(1+Math.sqrt(5))/2,es=1/bi,Sl=[new D(1,1,1),new D(-1,1,1),new D(1,1,-1),new D(-1,1,-1),new D(0,bi,es),new D(0,bi,-es),new D(es,0,bi),new D(-es,0,bi),new D(bi,es,0),new D(-bi,es,0)],kr=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100){Za=this._renderer.getRenderTarget(),Ja=this._renderer.getActiveCubeFace(),$a=this._renderer.getActiveMipmapLevel(),this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,n,s,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Tl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=wl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Za,Ja,$a),e.scissorTest=!1,Er(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===os||e.mapping===cs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Za=this._renderer.getRenderTarget(),Ja=this._renderer.getActiveCubeFace(),$a=this._renderer.getActiveMipmapLevel();let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:_n,minFilter:_n,generateMipmaps:!1,type:Fs,format:Rn,colorSpace:Xn,depthBuffer:!1},s=bl(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=bl(e,t,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=jp(r)),this._blurMaterial=Qp(r,e,t)}return s}_compileMaterial(e){let t=new V(this._lodPlanes[0],e);this._renderer.compile(t,Ya)}_sceneToCubeUV(e,t,n,s){let a=new rn(90,1,t,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,f=h.toneMapping;h.getClearColor(El),h.toneMapping=ri,h.autoClear=!1;let p=new mn({name:"PMREM.Background",side:hn,depthWrite:!1,depthTest:!1}),x=new V(new $e,p),M=!1,m=e.background;m?m.isColor&&(p.color.copy(m),e.background=null,M=!0):(p.color.copy(El),M=!0);for(let d=0;d<6;d++){let E=d%3;E===0?(a.up.set(0,c[d],0),a.lookAt(l[d],0,0)):E===1?(a.up.set(0,0,c[d]),a.lookAt(0,l[d],0)):(a.up.set(0,c[d],0),a.lookAt(0,0,l[d]));let y=this._cubeSize;Er(s,E*y,d>2?y:0,y,y),h.setRenderTarget(s),M&&h.render(x,a),h.render(e,a)}x.geometry.dispose(),x.material.dispose(),h.toneMapping=f,h.autoClear=u,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===os||e.mapping===cs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Tl()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=wl());let r=s?this._cubemapMaterial:this._equirectMaterial,o=new V(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;let c=this._cubeSize;Er(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(o,Ya)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;for(let s=1;s<this._lodPlanes.length;s++){let r=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=Sl[(s-1)%Sl.length];this._blur(e,s-1,s,r,o)}t.autoClear=n}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new V(this._lodPlanes[s],l),f=l.uniforms,p=this._sizeLods[n]-1,x=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*Ti-1),M=r/x,m=isFinite(r)?1+Math.floor(h*M):Ti;m>Ti&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ti}`);let d=[],E=0;for(let P=0;P<Ti;++P){let z=P/M,b=Math.exp(-z*z/2);d.push(b),P===0?E+=b:P<m&&(E+=2*b)}for(let P=0;P<d.length;P++)d[P]=d[P]/E;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=d,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);let{_lodMax:y}=this;f.dTheta.value=x,f.mipInt.value=y-n;let C=this._sizeLods[s],U=3*C*(s>y-ns?s-y+ns:0),T=4*(this._cubeSize-C);Er(t,U,T,3*C,2*C),c.setRenderTarget(t),c.render(u,Ya)}};function jp(i){let e=[],t=[],n=[],s=i,r=i-ns+1+Ml.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);t.push(a);let c=1/a;o>i-ns?c=Ml[o-i+ns-1]:o===0&&(c=0),n.push(c);let l=1/(a-2),h=-l,u=1+l,f=[h,h,u,h,u,u,h,h,u,u,h,u],p=6,x=6,M=3,m=2,d=1,E=new Float32Array(M*x*p),y=new Float32Array(m*x*p),C=new Float32Array(d*x*p);for(let T=0;T<p;T++){let P=T%3*2/3-1,z=T>2?0:-1,b=[P,z,0,P+2/3,z,0,P+2/3,z+1,0,P,z,0,P+2/3,z+1,0,P,z+1,0];E.set(b,M*x*T),y.set(f,m*x*T);let R=[T,T,T,T,T,T];C.set(R,d*x*T)}let U=new on;U.setAttribute("position",new yn(E,M)),U.setAttribute("uv",new yn(y,m)),U.setAttribute("faceIndex",new yn(C,d)),e.push(U),s>ns&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function bl(i,e,t){let n=new qn(i,e,t);return n.texture.mapping=ia,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Er(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Qp(i,e,t){let n=new Float32Array(Ti),s=new D(0,1,0);return new Yn({name:"SphericalGaussianBlur",defines:{n:Ti,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:si,depthTest:!1,depthWrite:!1})}function wl(){return new Yn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:si,depthTest:!1,depthWrite:!1})}function Tl(){return new Yn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:si,depthTest:!1,depthWrite:!1})}function $o(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function em(i){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){let c=a.mapping,l=c===so||c===ro,h=c===os||c===cs;if(l||h)if(a.isRenderTargetTexture&&a.needsPMREMUpdate===!0){a.needsPMREMUpdate=!1;let u=e.get(a);return t===null&&(t=new kr(i)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),e.set(a,u),u.texture}else{if(e.has(a))return e.get(a).texture;{let u=a.image;if(l&&u&&u.height>0||h&&u&&s(u)){t===null&&(t=new kr(i));let f=l?t.fromEquirectangular(a):t.fromCubemap(a);return e.set(a,f),a.addEventListener("dispose",r),f.texture}else return null}}}return a}function s(a){let c=0,l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){let c=a.target;c.removeEventListener("dispose",r);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function tm(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(n){n.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(n){let s=t(n);return s===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function nm(i,e,t,n){let s={},r=new WeakMap;function o(u){let f=u.target;f.index!==null&&e.remove(f.index);for(let x in f.attributes)e.remove(f.attributes[x]);for(let x in f.morphAttributes){let M=f.morphAttributes[x];for(let m=0,d=M.length;m<d;m++)e.remove(M[m])}f.removeEventListener("dispose",o),delete s[f.id];let p=r.get(f);p&&(e.remove(p),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(u,f){return s[f.id]===!0||(f.addEventListener("dispose",o),s[f.id]=!0,t.memory.geometries++),f}function c(u){let f=u.attributes;for(let x in f)e.update(f[x],i.ARRAY_BUFFER);let p=u.morphAttributes;for(let x in p){let M=p[x];for(let m=0,d=M.length;m<d;m++)e.update(M[m],i.ARRAY_BUFFER)}}function l(u){let f=[],p=u.index,x=u.attributes.position,M=0;if(p!==null){let E=p.array;M=p.version;for(let y=0,C=E.length;y<C;y+=3){let U=E[y+0],T=E[y+1],P=E[y+2];f.push(U,T,T,P,P,U)}}else if(x!==void 0){let E=x.array;M=x.version;for(let y=0,C=E.length/3-1;y<C;y+=3){let U=y+0,T=y+1,P=y+2;f.push(U,T,T,P,P,U)}}else return;let m=new(rh(f)?Hr:Br)(f,1);m.version=M;let d=r.get(u);d&&e.remove(d),r.set(u,m)}function h(u){let f=r.get(u);if(f){let p=u.index;p!==null&&f.version<p.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function im(i,e,t,n){let s=n.isWebGL2,r;function o(p){r=p}let a,c;function l(p){a=p.type,c=p.bytesPerElement}function h(p,x){i.drawElements(r,x,a,p*c),t.update(x,r,1)}function u(p,x,M){if(M===0)return;let m,d;if(s)m=i,d="drawElementsInstanced";else if(m=e.get("ANGLE_instanced_arrays"),d="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[d](r,x,a,p*c,M),t.update(x,r,M)}function f(p,x,M){if(M===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let d=0;d<M;d++)this.render(p[d]/c,x[d]);else{m.multiDrawElementsWEBGL(r,x,0,a,p,0,M);let d=0;for(let E=0;E<M;E++)d+=x[E];t.update(d,r,1)}}this.setMode=o,this.setIndex=l,this.render=h,this.renderInstances=u,this.renderMultiDraw=f}function sm(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function rm(i,e){return i[0]-e[0]}function am(i,e){return Math.abs(e[1])-Math.abs(i[1])}function om(i,e,t){let n={},s=new Float32Array(8),r=new WeakMap,o=new Zt,a=[];for(let l=0;l<8;l++)a[l]=[l,0];function c(l,h,u){let f=l.morphTargetInfluences;if(e.isWebGL2===!0){let p=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,x=p!==void 0?p.length:0,M=r.get(h);if(M===void 0||M.count!==x){let N=function(){$.dispose(),r.delete(h),h.removeEventListener("dispose",N)};M!==void 0&&M.texture.dispose();let E=h.morphAttributes.position!==void 0,y=h.morphAttributes.normal!==void 0,C=h.morphAttributes.color!==void 0,U=h.morphAttributes.position||[],T=h.morphAttributes.normal||[],P=h.morphAttributes.color||[],z=0;E===!0&&(z=1),y===!0&&(z=2),C===!0&&(z=3);let b=h.attributes.position.count*z,R=1;b>e.maxTextureSize&&(R=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);let G=new Float32Array(b*R*4*x),$=new Nr(G,b,R,x);$.type=ii,$.needsUpdate=!0;let ue=z*4;for(let H=0;H<x;H++){let K=U[H],ee=T[H],Q=P[H],j=b*R*4*H;for(let le=0;le<K.count;le++){let he=le*ue;E===!0&&(o.fromBufferAttribute(K,le),G[j+he+0]=o.x,G[j+he+1]=o.y,G[j+he+2]=o.z,G[j+he+3]=0),y===!0&&(o.fromBufferAttribute(ee,le),G[j+he+4]=o.x,G[j+he+5]=o.y,G[j+he+6]=o.z,G[j+he+7]=0),C===!0&&(o.fromBufferAttribute(Q,le),G[j+he+8]=o.x,G[j+he+9]=o.y,G[j+he+10]=o.z,G[j+he+11]=Q.itemSize===4?o.w:1)}}M={count:x,texture:$,size:new we(b,R)},r.set(h,M),h.addEventListener("dispose",N)}let m=0;for(let E=0;E<f.length;E++)m+=f[E];let d=h.morphTargetsRelative?1:1-m;u.getUniforms().setValue(i,"morphTargetBaseInfluence",d),u.getUniforms().setValue(i,"morphTargetInfluences",f),u.getUniforms().setValue(i,"morphTargetsTexture",M.texture,t),u.getUniforms().setValue(i,"morphTargetsTextureSize",M.size)}else{let p=f===void 0?0:f.length,x=n[h.id];if(x===void 0||x.length!==p){x=[];for(let y=0;y<p;y++)x[y]=[y,0];n[h.id]=x}for(let y=0;y<p;y++){let C=x[y];C[0]=y,C[1]=f[y]}x.sort(am);for(let y=0;y<8;y++)y<p&&x[y][1]?(a[y][0]=x[y][0],a[y][1]=x[y][1]):(a[y][0]=Number.MAX_SAFE_INTEGER,a[y][1]=0);a.sort(rm);let M=h.morphAttributes.position,m=h.morphAttributes.normal,d=0;for(let y=0;y<8;y++){let C=a[y],U=C[0],T=C[1];U!==Number.MAX_SAFE_INTEGER&&T?(M&&h.getAttribute("morphTarget"+y)!==M[U]&&h.setAttribute("morphTarget"+y,M[U]),m&&h.getAttribute("morphNormal"+y)!==m[U]&&h.setAttribute("morphNormal"+y,m[U]),s[y]=T,d+=T):(M&&h.hasAttribute("morphTarget"+y)===!0&&h.deleteAttribute("morphTarget"+y),m&&h.hasAttribute("morphNormal"+y)===!0&&h.deleteAttribute("morphNormal"+y),s[y]=0)}let E=h.morphTargetsRelative?1:1-d;u.getUniforms().setValue(i,"morphTargetBaseInfluence",E),u.getUniforms().setValue(i,"morphTargetInfluences",s)}}return{update:c}}function cm(i,e,t,n){let s=new WeakMap;function r(c){let l=n.render.frame,h=c.geometry,u=e.get(c,h);if(s.get(u)!==l&&(e.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),s.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){let f=c.skeleton;s.get(f)!==l&&(f.update(),s.set(f,l))}return u}function o(){s=new WeakMap}function a(c){let l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}var Wr=class extends vn{constructor(e,t,n,s,r,o,a,c,l,h){if(h=h!==void 0?h:Ri,h!==Ri&&h!==hs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Ri&&(n=ni),n===void 0&&h===hs&&(n=Ai),super(null,s,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=a!==void 0?a:sn,this.minFilter=c!==void 0?c:sn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},lh=new vn,hh=new Wr(1,1);hh.compareFunction=sh;var uh=new Nr,dh=new uo,fh=new Vr,Al=[],Rl=[],Cl=new Float32Array(16),Pl=new Float32Array(9),Ll=new Float32Array(4);function fs(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Al[s];if(r===void 0&&(r=new Float32Array(s),Al[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function kt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Wt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function ra(i,e){let t=Rl[e];t===void 0&&(t=new Int32Array(e),Rl[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function lm(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function hm(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(kt(t,e))return;i.uniform2fv(this.addr,e),Wt(t,e)}}function um(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(kt(t,e))return;i.uniform3fv(this.addr,e),Wt(t,e)}}function dm(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(kt(t,e))return;i.uniform4fv(this.addr,e),Wt(t,e)}}function fm(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(kt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Wt(t,e)}else{if(kt(t,n))return;Ll.set(n),i.uniformMatrix2fv(this.addr,!1,Ll),Wt(t,n)}}function pm(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(kt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Wt(t,e)}else{if(kt(t,n))return;Pl.set(n),i.uniformMatrix3fv(this.addr,!1,Pl),Wt(t,n)}}function mm(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(kt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Wt(t,e)}else{if(kt(t,n))return;Cl.set(n),i.uniformMatrix4fv(this.addr,!1,Cl),Wt(t,n)}}function gm(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function _m(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(kt(t,e))return;i.uniform2iv(this.addr,e),Wt(t,e)}}function xm(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(kt(t,e))return;i.uniform3iv(this.addr,e),Wt(t,e)}}function ym(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(kt(t,e))return;i.uniform4iv(this.addr,e),Wt(t,e)}}function vm(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Mm(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(kt(t,e))return;i.uniform2uiv(this.addr,e),Wt(t,e)}}function Em(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(kt(t,e))return;i.uniform3uiv(this.addr,e),Wt(t,e)}}function Sm(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(kt(t,e))return;i.uniform4uiv(this.addr,e),Wt(t,e)}}function bm(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r=this.type===i.SAMPLER_2D_SHADOW?hh:lh;t.setTexture2D(e||r,s)}function wm(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||dh,s)}function Tm(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||fh,s)}function Am(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||uh,s)}function Rm(i){switch(i){case 5126:return lm;case 35664:return hm;case 35665:return um;case 35666:return dm;case 35674:return fm;case 35675:return pm;case 35676:return mm;case 5124:case 35670:return gm;case 35667:case 35671:return _m;case 35668:case 35672:return xm;case 35669:case 35673:return ym;case 5125:return vm;case 36294:return Mm;case 36295:return Em;case 36296:return Sm;case 35678:case 36198:case 36298:case 36306:case 35682:return bm;case 35679:case 36299:case 36307:return wm;case 35680:case 36300:case 36308:case 36293:return Tm;case 36289:case 36303:case 36311:case 36292:return Am}}function Cm(i,e){i.uniform1fv(this.addr,e)}function Pm(i,e){let t=fs(e,this.size,2);i.uniform2fv(this.addr,t)}function Lm(i,e){let t=fs(e,this.size,3);i.uniform3fv(this.addr,t)}function Im(i,e){let t=fs(e,this.size,4);i.uniform4fv(this.addr,t)}function Dm(i,e){let t=fs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Um(i,e){let t=fs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Nm(i,e){let t=fs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Om(i,e){i.uniform1iv(this.addr,e)}function Fm(i,e){i.uniform2iv(this.addr,e)}function Bm(i,e){i.uniform3iv(this.addr,e)}function Hm(i,e){i.uniform4iv(this.addr,e)}function zm(i,e){i.uniform1uiv(this.addr,e)}function Vm(i,e){i.uniform2uiv(this.addr,e)}function Gm(i,e){i.uniform3uiv(this.addr,e)}function km(i,e){i.uniform4uiv(this.addr,e)}function Wm(i,e,t){let n=this.cache,s=e.length,r=ra(t,s);kt(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||lh,r[o])}function Xm(i,e,t){let n=this.cache,s=e.length,r=ra(t,s);kt(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||dh,r[o])}function qm(i,e,t){let n=this.cache,s=e.length,r=ra(t,s);kt(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||fh,r[o])}function Ym(i,e,t){let n=this.cache,s=e.length,r=ra(t,s);kt(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||uh,r[o])}function Zm(i){switch(i){case 5126:return Cm;case 35664:return Pm;case 35665:return Lm;case 35666:return Im;case 35674:return Dm;case 35675:return Um;case 35676:return Nm;case 5124:case 35670:return Om;case 35667:case 35671:return Fm;case 35668:case 35672:return Bm;case 35669:case 35673:return Hm;case 5125:return zm;case 36294:return Vm;case 36295:return Gm;case 36296:return km;case 35678:case 36198:case 36298:case 36306:case 35682:return Wm;case 35679:case 36299:case 36307:return Xm;case 35680:case 36300:case 36308:case 36293:return qm;case 36289:case 36303:case 36311:case 36292:return Ym}}var mo=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Rm(t.type)}},go=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Zm(t.type)}},_o=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}},Ka=/(\w+)(\])?(\[|\.)?/g;function Il(i,e){i.seq.push(e),i.map[e.id]=e}function Jm(i,e,t){let n=i.name,s=n.length;for(Ka.lastIndex=0;;){let r=Ka.exec(n),o=Ka.lastIndex,a=r[1],c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){Il(t,l===void 0?new mo(a,i,e):new go(a,i,e));break}else{let u=t.map[a];u===void 0&&(u=new _o(a),Il(t,u)),t=u}}}var as=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);Jm(r,o,this)}}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};function Dl(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var $m=37297,Km=0;function jm(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}function Qm(i){let e=wt.getPrimaries(wt.workingColorSpace),t=wt.getPrimaries(i),n;switch(e===t?n="":e===Pr&&t===Cr?n="LinearDisplayP3ToLinearSRGB":e===Cr&&t===Pr&&(n="LinearSRGBToLinearDisplayP3"),i){case Xn:case sa:return[n,"LinearTransferOETF"];case $t:case Jo:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",i),[n,"LinearTransferOETF"]}}function Ul(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),s=i.getShaderInfoLog(e).trim();if(n&&s==="")return"";let r=/ERROR: 0:(\d+)/.exec(s);if(r){let o=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+jm(i.getShaderSource(e),o)}else return s}function eg(i,e){let t=Qm(e);return`vec4 ${i}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function tg(i,e){let t;switch(e){case xu:t="Linear";break;case yu:t="Reinhard";break;case vu:t="OptimizedCineon";break;case Mu:t="ACESFilmic";break;case Su:t="AgX";break;case Eu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function ng(i){return[i.extensionDerivatives||i.envMapCubeUVHeight||i.bumpMap||i.normalMapTangentSpace||i.clearcoatNormalMap||i.flatShading||i.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(i.extensionFragDepth||i.logarithmicDepthBuffer)&&i.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",i.extensionDrawBuffers&&i.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(i.extensionShaderTextureLOD||i.envMap||i.transmission)&&i.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(is).join(`
`)}function ig(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(is).join(`
`)}function sg(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function rg(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function is(i){return i!==""}function Nl(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ol(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var ag=/^[ \t]*#include +<([\w\d./]+)>/gm;function xo(i){return i.replace(ag,cg)}var og=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function cg(i,e){let t=ut[e];if(t===void 0){let n=og.get(e);if(n!==void 0)t=ut[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return xo(t)}var lg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Fl(i){return i.replace(lg,hg)}function hg(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Bl(i){let e="precision "+i.precision+` float;
precision `+i.precision+" int;";return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function ug(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===na?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Yo?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Gn&&(e="SHADOWMAP_TYPE_VSM"),e}function dg(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case os:case cs:e="ENVMAP_TYPE_CUBE";break;case ia:e="ENVMAP_TYPE_CUBE_UV";break}return e}function fg(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case cs:e="ENVMAP_MODE_REFRACTION";break}return e}function pg(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Yl:e="ENVMAP_BLENDING_MULTIPLY";break;case gu:e="ENVMAP_BLENDING_MIX";break;case _u:e="ENVMAP_BLENDING_ADD";break}return e}function mg(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function gg(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,c=ug(t),l=dg(t),h=fg(t),u=pg(t),f=mg(t),p=t.isWebGL2?"":ng(t),x=ig(t),M=sg(r),m=s.createProgram(),d,E,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(is).join(`
`),d.length>0&&(d+=`
`),E=[p,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(is).join(`
`),E.length>0&&(E+=`
`)):(d=[Bl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(is).join(`
`),E=[p,Bl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ri?"#define TONE_MAPPING":"",t.toneMapping!==ri?ut.tonemapping_pars_fragment:"",t.toneMapping!==ri?tg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ut.colorspace_pars_fragment,eg("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(is).join(`
`)),o=xo(o),o=Nl(o,t),o=Ol(o,t),a=xo(a),a=Nl(a,t),a=Ol(a,t),o=Fl(o),a=Fl(a),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,d=[x,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,E=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===il?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===il?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+E);let C=y+d+o,U=y+E+a,T=Dl(s,s.VERTEX_SHADER,C),P=Dl(s,s.FRAGMENT_SHADER,U);s.attachShader(m,T),s.attachShader(m,P),t.index0AttributeName!==void 0?s.bindAttribLocation(m,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(m,0,"position"),s.linkProgram(m);function z($){if(i.debug.checkShaderErrors){let ue=s.getProgramInfoLog(m).trim(),N=s.getShaderInfoLog(T).trim(),H=s.getShaderInfoLog(P).trim(),K=!0,ee=!0;if(s.getProgramParameter(m,s.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,m,T,P);else{let Q=Ul(s,T,"vertex"),j=Ul(s,P,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(m,s.VALIDATE_STATUS)+`

Program Info Log: `+ue+`
`+Q+`
`+j)}else ue!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ue):(N===""||H==="")&&(ee=!1);ee&&($.diagnostics={runnable:K,programLog:ue,vertexShader:{log:N,prefix:d},fragmentShader:{log:H,prefix:E}})}s.deleteShader(T),s.deleteShader(P),b=new as(s,m),R=rg(s,m)}let b;this.getUniforms=function(){return b===void 0&&z(this),b};let R;this.getAttributes=function(){return R===void 0&&z(this),R};let G=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return G===!1&&(G=s.getProgramParameter(m,$m)),G},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Km++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=T,this.fragmentShader=P,this}var _g=0,yo=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new vo(e),t.set(e,n)),n}},vo=class{constructor(e){this.id=_g++,this.code=e,this.usedTimes=0}};function xg(i,e,t,n,s,r,o){let a=new Hs,c=new yo,l=[],h=s.isWebGL2,u=s.logarithmicDepthBuffer,f=s.vertexTextures,p=s.precision,x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(b){return b===0?"uv":`uv${b}`}function m(b,R,G,$,ue){let N=$.fog,H=ue.geometry,K=b.isMeshStandardMaterial?$.environment:null,ee=(b.isMeshStandardMaterial?t:e).get(b.envMap||K),Q=ee&&ee.mapping===ia?ee.image.height:null,j=x[b.type];b.precision!==null&&(p=s.getMaxPrecision(b.precision),p!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",p,"instead."));let le=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,he=le!==void 0?le.length:0,ve=0;H.morphAttributes.position!==void 0&&(ve=1),H.morphAttributes.normal!==void 0&&(ve=2),H.morphAttributes.color!==void 0&&(ve=3);let J,se,ye,Ie;if(j){let Jt=Dn[j];J=Jt.vertexShader,se=Jt.fragmentShader}else J=b.vertexShader,se=b.fragmentShader,c.update(b),ye=c.getVertexShaderID(b),Ie=c.getFragmentShaderID(b);let De=i.getRenderTarget(),et=ue.isInstancedMesh===!0,Ke=ue.isBatchedMesh===!0,Ge=!!b.map,ft=!!b.matcap,k=!!ee,Ft=!!b.aoMap,He=!!b.lightMap,Ze=!!b.bumpMap,Ue=!!b.normalMap,Tt=!!b.displacementMap,rt=!!b.emissiveMap,A=!!b.metalnessMap,S=!!b.roughnessMap,W=b.anisotropy>0,re=b.clearcoat>0,te=b.iridescence>0,ae=b.sheen>0,Ee=b.transmission>0,_e=W&&!!b.anisotropyMap,oe=re&&!!b.clearcoatMap,We=re&&!!b.clearcoatNormalMap,nt=re&&!!b.clearcoatRoughnessMap,ce=te&&!!b.iridescenceMap,yt=te&&!!b.iridescenceThicknessMap,lt=ae&&!!b.sheenColorMap,ze=ae&&!!b.sheenRoughnessMap,ke=!!b.specularMap,Te=!!b.specularColorMap,at=!!b.specularIntensityMap,gt=Ee&&!!b.transmissionMap,At=Ee&&!!b.thicknessMap,dt=!!b.gradientMap,fe=!!b.alphaMap,O=b.alphaTest>0,pe=!!b.alphaHash,xe=!!b.extensions,Je=!!H.attributes.uv1,Ve=!!H.attributes.uv2,vt=!!H.attributes.uv3,_t=ri;return b.toneMapped&&(De===null||De.isXRRenderTarget===!0)&&(_t=i.toneMapping),{isWebGL2:h,shaderID:j,shaderType:b.type,shaderName:b.name,vertexShader:J,fragmentShader:se,defines:b.defines,customVertexShaderID:ye,customFragmentShaderID:Ie,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:p,batching:Ke,instancing:et,instancingColor:et&&ue.instanceColor!==null,supportsVertexTextures:f,outputColorSpace:De===null?i.outputColorSpace:De.isXRRenderTarget===!0?De.texture.colorSpace:Xn,map:Ge,matcap:ft,envMap:k,envMapMode:k&&ee.mapping,envMapCubeUVHeight:Q,aoMap:Ft,lightMap:He,bumpMap:Ze,normalMap:Ue,displacementMap:f&&Tt,emissiveMap:rt,normalMapObjectSpace:Ue&&b.normalMapType===Nu,normalMapTangentSpace:Ue&&b.normalMapType===ih,metalnessMap:A,roughnessMap:S,anisotropy:W,anisotropyMap:_e,clearcoat:re,clearcoatMap:oe,clearcoatNormalMap:We,clearcoatRoughnessMap:nt,iridescence:te,iridescenceMap:ce,iridescenceThicknessMap:yt,sheen:ae,sheenColorMap:lt,sheenRoughnessMap:ze,specularMap:ke,specularColorMap:Te,specularIntensityMap:at,transmission:Ee,transmissionMap:gt,thicknessMap:At,gradientMap:dt,opaque:b.transparent===!1&&b.blending===ss,alphaMap:fe,alphaTest:O,alphaHash:pe,combine:b.combine,mapUv:Ge&&M(b.map.channel),aoMapUv:Ft&&M(b.aoMap.channel),lightMapUv:He&&M(b.lightMap.channel),bumpMapUv:Ze&&M(b.bumpMap.channel),normalMapUv:Ue&&M(b.normalMap.channel),displacementMapUv:Tt&&M(b.displacementMap.channel),emissiveMapUv:rt&&M(b.emissiveMap.channel),metalnessMapUv:A&&M(b.metalnessMap.channel),roughnessMapUv:S&&M(b.roughnessMap.channel),anisotropyMapUv:_e&&M(b.anisotropyMap.channel),clearcoatMapUv:oe&&M(b.clearcoatMap.channel),clearcoatNormalMapUv:We&&M(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:nt&&M(b.clearcoatRoughnessMap.channel),iridescenceMapUv:ce&&M(b.iridescenceMap.channel),iridescenceThicknessMapUv:yt&&M(b.iridescenceThicknessMap.channel),sheenColorMapUv:lt&&M(b.sheenColorMap.channel),sheenRoughnessMapUv:ze&&M(b.sheenRoughnessMap.channel),specularMapUv:ke&&M(b.specularMap.channel),specularColorMapUv:Te&&M(b.specularColorMap.channel),specularIntensityMapUv:at&&M(b.specularIntensityMap.channel),transmissionMapUv:gt&&M(b.transmissionMap.channel),thicknessMapUv:At&&M(b.thicknessMap.channel),alphaMapUv:fe&&M(b.alphaMap.channel),vertexTangents:!!H.attributes.tangent&&(Ue||W),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,vertexUv1s:Je,vertexUv2s:Ve,vertexUv3s:vt,pointsUvs:ue.isPoints===!0&&!!H.attributes.uv&&(Ge||fe),fog:!!N,useFog:b.fog===!0,fogExp2:N&&N.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,skinning:ue.isSkinnedMesh===!0,morphTargets:H.morphAttributes.position!==void 0,morphNormals:H.morphAttributes.normal!==void 0,morphColors:H.morphAttributes.color!==void 0,morphTargetsCount:he,morphTextureStride:ve,numDirLights:R.directional.length,numPointLights:R.point.length,numSpotLights:R.spot.length,numSpotLightMaps:R.spotLightMap.length,numRectAreaLights:R.rectArea.length,numHemiLights:R.hemi.length,numDirLightShadows:R.directionalShadowMap.length,numPointLightShadows:R.pointShadowMap.length,numSpotLightShadows:R.spotShadowMap.length,numSpotLightShadowsWithMaps:R.numSpotLightShadowsWithMaps,numLightProbes:R.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&G.length>0,shadowMapType:i.shadowMap.type,toneMapping:_t,useLegacyLights:i._useLegacyLights,decodeVideoTexture:Ge&&b.map.isVideoTexture===!0&&wt.getTransfer(b.map.colorSpace)===Pt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===pn,flipSided:b.side===hn,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionDerivatives:xe&&b.extensions.derivatives===!0,extensionFragDepth:xe&&b.extensions.fragDepth===!0,extensionDrawBuffers:xe&&b.extensions.drawBuffers===!0,extensionShaderTextureLOD:xe&&b.extensions.shaderTextureLOD===!0,extensionClipCullDistance:xe&&b.extensions.clipCullDistance&&n.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||n.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||n.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||n.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()}}function d(b){let R=[];if(b.shaderID?R.push(b.shaderID):(R.push(b.customVertexShaderID),R.push(b.customFragmentShaderID)),b.defines!==void 0)for(let G in b.defines)R.push(G),R.push(b.defines[G]);return b.isRawShaderMaterial===!1&&(E(R,b),y(R,b),R.push(i.outputColorSpace)),R.push(b.customProgramCacheKey),R.join()}function E(b,R){b.push(R.precision),b.push(R.outputColorSpace),b.push(R.envMapMode),b.push(R.envMapCubeUVHeight),b.push(R.mapUv),b.push(R.alphaMapUv),b.push(R.lightMapUv),b.push(R.aoMapUv),b.push(R.bumpMapUv),b.push(R.normalMapUv),b.push(R.displacementMapUv),b.push(R.emissiveMapUv),b.push(R.metalnessMapUv),b.push(R.roughnessMapUv),b.push(R.anisotropyMapUv),b.push(R.clearcoatMapUv),b.push(R.clearcoatNormalMapUv),b.push(R.clearcoatRoughnessMapUv),b.push(R.iridescenceMapUv),b.push(R.iridescenceThicknessMapUv),b.push(R.sheenColorMapUv),b.push(R.sheenRoughnessMapUv),b.push(R.specularMapUv),b.push(R.specularColorMapUv),b.push(R.specularIntensityMapUv),b.push(R.transmissionMapUv),b.push(R.thicknessMapUv),b.push(R.combine),b.push(R.fogExp2),b.push(R.sizeAttenuation),b.push(R.morphTargetsCount),b.push(R.morphAttributeCount),b.push(R.numDirLights),b.push(R.numPointLights),b.push(R.numSpotLights),b.push(R.numSpotLightMaps),b.push(R.numHemiLights),b.push(R.numRectAreaLights),b.push(R.numDirLightShadows),b.push(R.numPointLightShadows),b.push(R.numSpotLightShadows),b.push(R.numSpotLightShadowsWithMaps),b.push(R.numLightProbes),b.push(R.shadowMapType),b.push(R.toneMapping),b.push(R.numClippingPlanes),b.push(R.numClipIntersection),b.push(R.depthPacking)}function y(b,R){a.disableAll(),R.isWebGL2&&a.enable(0),R.supportsVertexTextures&&a.enable(1),R.instancing&&a.enable(2),R.instancingColor&&a.enable(3),R.matcap&&a.enable(4),R.envMap&&a.enable(5),R.normalMapObjectSpace&&a.enable(6),R.normalMapTangentSpace&&a.enable(7),R.clearcoat&&a.enable(8),R.iridescence&&a.enable(9),R.alphaTest&&a.enable(10),R.vertexColors&&a.enable(11),R.vertexAlphas&&a.enable(12),R.vertexUv1s&&a.enable(13),R.vertexUv2s&&a.enable(14),R.vertexUv3s&&a.enable(15),R.vertexTangents&&a.enable(16),R.anisotropy&&a.enable(17),R.alphaHash&&a.enable(18),R.batching&&a.enable(19),b.push(a.mask),a.disableAll(),R.fog&&a.enable(0),R.useFog&&a.enable(1),R.flatShading&&a.enable(2),R.logarithmicDepthBuffer&&a.enable(3),R.skinning&&a.enable(4),R.morphTargets&&a.enable(5),R.morphNormals&&a.enable(6),R.morphColors&&a.enable(7),R.premultipliedAlpha&&a.enable(8),R.shadowMapEnabled&&a.enable(9),R.useLegacyLights&&a.enable(10),R.doubleSided&&a.enable(11),R.flipSided&&a.enable(12),R.useDepthPacking&&a.enable(13),R.dithering&&a.enable(14),R.transmission&&a.enable(15),R.sheen&&a.enable(16),R.opaque&&a.enable(17),R.pointsUvs&&a.enable(18),R.decodeVideoTexture&&a.enable(19),b.push(a.mask)}function C(b){let R=x[b.type],G;if(R){let $=Dn[R];G=ad.clone($.uniforms)}else G=b.uniforms;return G}function U(b,R){let G;for(let $=0,ue=l.length;$<ue;$++){let N=l[$];if(N.cacheKey===R){G=N,++G.usedTimes;break}}return G===void 0&&(G=new gg(i,R,b,r),l.push(G)),G}function T(b){if(--b.usedTimes===0){let R=l.indexOf(b);l[R]=l[l.length-1],l.pop(),b.destroy()}}function P(b){c.remove(b)}function z(){c.dispose()}return{getParameters:m,getProgramCacheKey:d,getUniforms:C,acquireProgram:U,releaseProgram:T,releaseShaderCache:P,programs:l,dispose:z}}function yg(){let i=new WeakMap;function e(r){let o=i.get(r);return o===void 0&&(o={},i.set(r,o)),o}function t(r){i.delete(r)}function n(r,o,a){i.get(r)[o]=a}function s(){i=new WeakMap}return{get:e,remove:t,update:n,dispose:s}}function vg(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Hl(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function zl(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(u,f,p,x,M,m){let d=i[e];return d===void 0?(d={id:u.id,object:u,geometry:f,material:p,groupOrder:x,renderOrder:u.renderOrder,z:M,group:m},i[e]=d):(d.id=u.id,d.object=u,d.geometry=f,d.material=p,d.groupOrder=x,d.renderOrder=u.renderOrder,d.z=M,d.group=m),e++,d}function a(u,f,p,x,M,m){let d=o(u,f,p,x,M,m);p.transmission>0?n.push(d):p.transparent===!0?s.push(d):t.push(d)}function c(u,f,p,x,M,m){let d=o(u,f,p,x,M,m);p.transmission>0?n.unshift(d):p.transparent===!0?s.unshift(d):t.unshift(d)}function l(u,f){t.length>1&&t.sort(u||vg),n.length>1&&n.sort(f||Hl),s.length>1&&s.sort(f||Hl)}function h(){for(let u=e,f=i.length;u<f;u++){let p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:a,unshift:c,finish:h,sort:l}}function Mg(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new zl,i.set(n,[o])):s>=r.length?(o=new zl,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Eg(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new D,color:new qe};break;case"SpotLight":t={position:new D,direction:new D,color:new qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new D,color:new qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new D,skyColor:new qe,groundColor:new qe};break;case"RectAreaLight":t={color:new qe,position:new D,halfWidth:new D,halfHeight:new D};break}return i[e.id]=t,t}}}function Sg(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var bg=0;function wg(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Tg(i,e){let t=new Eg,n=Sg(),s={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)s.probe.push(new D);let r=new D,o=new Gt,a=new Gt;function c(h,u){let f=0,p=0,x=0;for(let $=0;$<9;$++)s.probe[$].set(0,0,0);let M=0,m=0,d=0,E=0,y=0,C=0,U=0,T=0,P=0,z=0,b=0;h.sort(wg);let R=u===!0?Math.PI:1;for(let $=0,ue=h.length;$<ue;$++){let N=h[$],H=N.color,K=N.intensity,ee=N.distance,Q=N.shadow&&N.shadow.map?N.shadow.map.texture:null;if(N.isAmbientLight)f+=H.r*K*R,p+=H.g*K*R,x+=H.b*K*R;else if(N.isLightProbe){for(let j=0;j<9;j++)s.probe[j].addScaledVector(N.sh.coefficients[j],K);b++}else if(N.isDirectionalLight){let j=t.get(N);if(j.color.copy(N.color).multiplyScalar(N.intensity*R),N.castShadow){let le=N.shadow,he=n.get(N);he.shadowBias=le.bias,he.shadowNormalBias=le.normalBias,he.shadowRadius=le.radius,he.shadowMapSize=le.mapSize,s.directionalShadow[M]=he,s.directionalShadowMap[M]=Q,s.directionalShadowMatrix[M]=N.shadow.matrix,C++}s.directional[M]=j,M++}else if(N.isSpotLight){let j=t.get(N);j.position.setFromMatrixPosition(N.matrixWorld),j.color.copy(H).multiplyScalar(K*R),j.distance=ee,j.coneCos=Math.cos(N.angle),j.penumbraCos=Math.cos(N.angle*(1-N.penumbra)),j.decay=N.decay,s.spot[d]=j;let le=N.shadow;if(N.map&&(s.spotLightMap[P]=N.map,P++,le.updateMatrices(N),N.castShadow&&z++),s.spotLightMatrix[d]=le.matrix,N.castShadow){let he=n.get(N);he.shadowBias=le.bias,he.shadowNormalBias=le.normalBias,he.shadowRadius=le.radius,he.shadowMapSize=le.mapSize,s.spotShadow[d]=he,s.spotShadowMap[d]=Q,T++}d++}else if(N.isRectAreaLight){let j=t.get(N);j.color.copy(H).multiplyScalar(K),j.halfWidth.set(N.width*.5,0,0),j.halfHeight.set(0,N.height*.5,0),s.rectArea[E]=j,E++}else if(N.isPointLight){let j=t.get(N);if(j.color.copy(N.color).multiplyScalar(N.intensity*R),j.distance=N.distance,j.decay=N.decay,N.castShadow){let le=N.shadow,he=n.get(N);he.shadowBias=le.bias,he.shadowNormalBias=le.normalBias,he.shadowRadius=le.radius,he.shadowMapSize=le.mapSize,he.shadowCameraNear=le.camera.near,he.shadowCameraFar=le.camera.far,s.pointShadow[m]=he,s.pointShadowMap[m]=Q,s.pointShadowMatrix[m]=N.shadow.matrix,U++}s.point[m]=j,m++}else if(N.isHemisphereLight){let j=t.get(N);j.skyColor.copy(N.color).multiplyScalar(K*R),j.groundColor.copy(N.groundColor).multiplyScalar(K*R),s.hemi[y]=j,y++}}E>0&&(e.isWebGL2?i.has("OES_texture_float_linear")===!0?(s.rectAreaLTC1=ge.LTC_FLOAT_1,s.rectAreaLTC2=ge.LTC_FLOAT_2):(s.rectAreaLTC1=ge.LTC_HALF_1,s.rectAreaLTC2=ge.LTC_HALF_2):i.has("OES_texture_float_linear")===!0?(s.rectAreaLTC1=ge.LTC_FLOAT_1,s.rectAreaLTC2=ge.LTC_FLOAT_2):i.has("OES_texture_half_float_linear")===!0?(s.rectAreaLTC1=ge.LTC_HALF_1,s.rectAreaLTC2=ge.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),s.ambient[0]=f,s.ambient[1]=p,s.ambient[2]=x;let G=s.hash;(G.directionalLength!==M||G.pointLength!==m||G.spotLength!==d||G.rectAreaLength!==E||G.hemiLength!==y||G.numDirectionalShadows!==C||G.numPointShadows!==U||G.numSpotShadows!==T||G.numSpotMaps!==P||G.numLightProbes!==b)&&(s.directional.length=M,s.spot.length=d,s.rectArea.length=E,s.point.length=m,s.hemi.length=y,s.directionalShadow.length=C,s.directionalShadowMap.length=C,s.pointShadow.length=U,s.pointShadowMap.length=U,s.spotShadow.length=T,s.spotShadowMap.length=T,s.directionalShadowMatrix.length=C,s.pointShadowMatrix.length=U,s.spotLightMatrix.length=T+P-z,s.spotLightMap.length=P,s.numSpotLightShadowsWithMaps=z,s.numLightProbes=b,G.directionalLength=M,G.pointLength=m,G.spotLength=d,G.rectAreaLength=E,G.hemiLength=y,G.numDirectionalShadows=C,G.numPointShadows=U,G.numSpotShadows=T,G.numSpotMaps=P,G.numLightProbes=b,s.version=bg++)}function l(h,u){let f=0,p=0,x=0,M=0,m=0,d=u.matrixWorldInverse;for(let E=0,y=h.length;E<y;E++){let C=h[E];if(C.isDirectionalLight){let U=s.directional[f];U.direction.setFromMatrixPosition(C.matrixWorld),r.setFromMatrixPosition(C.target.matrixWorld),U.direction.sub(r),U.direction.transformDirection(d),f++}else if(C.isSpotLight){let U=s.spot[x];U.position.setFromMatrixPosition(C.matrixWorld),U.position.applyMatrix4(d),U.direction.setFromMatrixPosition(C.matrixWorld),r.setFromMatrixPosition(C.target.matrixWorld),U.direction.sub(r),U.direction.transformDirection(d),x++}else if(C.isRectAreaLight){let U=s.rectArea[M];U.position.setFromMatrixPosition(C.matrixWorld),U.position.applyMatrix4(d),a.identity(),o.copy(C.matrixWorld),o.premultiply(d),a.extractRotation(o),U.halfWidth.set(C.width*.5,0,0),U.halfHeight.set(0,C.height*.5,0),U.halfWidth.applyMatrix4(a),U.halfHeight.applyMatrix4(a),M++}else if(C.isPointLight){let U=s.point[p];U.position.setFromMatrixPosition(C.matrixWorld),U.position.applyMatrix4(d),p++}else if(C.isHemisphereLight){let U=s.hemi[m];U.direction.setFromMatrixPosition(C.matrixWorld),U.direction.transformDirection(d),m++}}}return{setup:c,setupView:l,state:s}}function Vl(i,e){let t=new Tg(i,e),n=[],s=[];function r(){n.length=0,s.length=0}function o(u){n.push(u)}function a(u){s.push(u)}function c(u){t.setup(n,u)}function l(u){t.setupView(n,u)}return{init:r,state:{lightsArray:n,shadowsArray:s,lights:t},setupLights:c,setupLightsView:l,pushLight:o,pushShadow:a}}function Ag(i,e){let t=new WeakMap;function n(r,o=0){let a=t.get(r),c;return a===void 0?(c=new Vl(i,e),t.set(r,[c])):o>=a.length?(c=new Vl(i,e),a.push(c)):c=a[o],c}function s(){t=new WeakMap}return{get:n,dispose:s}}var Mo=class extends Li{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Du,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Eo=class extends Li{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Rg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Cg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Pg(i,e,t){let n=new zs,s=new we,r=new we,o=new Zt,a=new Mo({depthPacking:Uu}),c=new Eo,l={},h=t.maxTextureSize,u={[oi]:hn,[hn]:oi,[pn]:pn},f=new Yn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:Rg,fragmentShader:Cg}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let x=new on;x.setAttribute("position",new yn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let M=new V(x,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=na;let d=this.type;this.render=function(T,P,z){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;let b=i.getRenderTarget(),R=i.getActiveCubeFace(),G=i.getActiveMipmapLevel(),$=i.state;$.setBlending(si),$.buffers.color.setClear(1,1,1,1),$.buffers.depth.setTest(!0),$.setScissorTest(!1);let ue=d!==Gn&&this.type===Gn,N=d===Gn&&this.type!==Gn;for(let H=0,K=T.length;H<K;H++){let ee=T[H],Q=ee.shadow;if(Q===void 0){console.warn("THREE.WebGLShadowMap:",ee,"has no shadow.");continue}if(Q.autoUpdate===!1&&Q.needsUpdate===!1)continue;s.copy(Q.mapSize);let j=Q.getFrameExtents();if(s.multiply(j),r.copy(Q.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/j.x),s.x=r.x*j.x,Q.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/j.y),s.y=r.y*j.y,Q.mapSize.y=r.y)),Q.map===null||ue===!0||N===!0){let he=this.type!==Gn?{minFilter:sn,magFilter:sn}:{};Q.map!==null&&Q.map.dispose(),Q.map=new qn(s.x,s.y,he),Q.map.texture.name=ee.name+".shadowMap",Q.camera.updateProjectionMatrix()}i.setRenderTarget(Q.map),i.clear();let le=Q.getViewportCount();for(let he=0;he<le;he++){let ve=Q.getViewport(he);o.set(r.x*ve.x,r.y*ve.y,r.x*ve.z,r.y*ve.w),$.viewport(o),Q.updateMatrices(ee,he),n=Q.getFrustum(),C(P,z,Q.camera,ee,this.type)}Q.isPointLightShadow!==!0&&this.type===Gn&&E(Q,z),Q.needsUpdate=!1}d=this.type,m.needsUpdate=!1,i.setRenderTarget(b,R,G)};function E(T,P){let z=e.update(M);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,p.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new qn(s.x,s.y)),f.uniforms.shadow_pass.value=T.map.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(P,null,z,f,M,null),p.uniforms.shadow_pass.value=T.mapPass.texture,p.uniforms.resolution.value=T.mapSize,p.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(P,null,z,p,M,null)}function y(T,P,z,b){let R=null,G=z.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(G!==void 0)R=G;else if(R=z.isPointLight===!0?c:a,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0){let $=R.uuid,ue=P.uuid,N=l[$];N===void 0&&(N={},l[$]=N);let H=N[ue];H===void 0&&(H=R.clone(),N[ue]=H,P.addEventListener("dispose",U)),R=H}if(R.visible=P.visible,R.wireframe=P.wireframe,b===Gn?R.side=P.shadowSide!==null?P.shadowSide:P.side:R.side=P.shadowSide!==null?P.shadowSide:u[P.side],R.alphaMap=P.alphaMap,R.alphaTest=P.alphaTest,R.map=P.map,R.clipShadows=P.clipShadows,R.clippingPlanes=P.clippingPlanes,R.clipIntersection=P.clipIntersection,R.displacementMap=P.displacementMap,R.displacementScale=P.displacementScale,R.displacementBias=P.displacementBias,R.wireframeLinewidth=P.wireframeLinewidth,R.linewidth=P.linewidth,z.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let $=i.properties.get(R);$.light=z}return R}function C(T,P,z,b,R){if(T.visible===!1)return;if(T.layers.test(P.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&R===Gn)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse,T.matrixWorld);let ue=e.update(T),N=T.material;if(Array.isArray(N)){let H=ue.groups;for(let K=0,ee=H.length;K<ee;K++){let Q=H[K],j=N[Q.materialIndex];if(j&&j.visible){let le=y(T,j,b,R);T.onBeforeShadow(i,T,P,z,ue,le,Q),i.renderBufferDirect(z,null,ue,le,T,Q),T.onAfterShadow(i,T,P,z,ue,le,Q)}}}else if(N.visible){let H=y(T,N,b,R);T.onBeforeShadow(i,T,P,z,ue,H,null),i.renderBufferDirect(z,null,ue,H,T,null),T.onAfterShadow(i,T,P,z,ue,H,null)}}let $=T.children;for(let ue=0,N=$.length;ue<N;ue++)C($[ue],P,z,b,R)}function U(T){T.target.removeEventListener("dispose",U);for(let z in l){let b=l[z],R=T.target.uuid;R in b&&(b[R].dispose(),delete b[R])}}}function Lg(i,e,t){let n=t.isWebGL2;function s(){let O=!1,pe=new Zt,xe=null,Je=new Zt(0,0,0,0);return{setMask:function(Ve){xe!==Ve&&!O&&(i.colorMask(Ve,Ve,Ve,Ve),xe=Ve)},setLocked:function(Ve){O=Ve},setClear:function(Ve,vt,_t,Bt,Jt){Jt===!0&&(Ve*=Bt,vt*=Bt,_t*=Bt),pe.set(Ve,vt,_t,Bt),Je.equals(pe)===!1&&(i.clearColor(Ve,vt,_t,Bt),Je.copy(pe))},reset:function(){O=!1,xe=null,Je.set(-1,0,0,0)}}}function r(){let O=!1,pe=null,xe=null,Je=null;return{setTest:function(Ve){Ve?Ke(i.DEPTH_TEST):Ge(i.DEPTH_TEST)},setMask:function(Ve){pe!==Ve&&!O&&(i.depthMask(Ve),pe=Ve)},setFunc:function(Ve){if(xe!==Ve){switch(Ve){case lu:i.depthFunc(i.NEVER);break;case hu:i.depthFunc(i.ALWAYS);break;case uu:i.depthFunc(i.LESS);break;case wr:i.depthFunc(i.LEQUAL);break;case du:i.depthFunc(i.EQUAL);break;case fu:i.depthFunc(i.GEQUAL);break;case pu:i.depthFunc(i.GREATER);break;case mu:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}xe=Ve}},setLocked:function(Ve){O=Ve},setClear:function(Ve){Je!==Ve&&(i.clearDepth(Ve),Je=Ve)},reset:function(){O=!1,pe=null,xe=null,Je=null}}}function o(){let O=!1,pe=null,xe=null,Je=null,Ve=null,vt=null,_t=null,Bt=null,Jt=null;return{setTest:function(bt){O||(bt?Ke(i.STENCIL_TEST):Ge(i.STENCIL_TEST))},setMask:function(bt){pe!==bt&&!O&&(i.stencilMask(bt),pe=bt)},setFunc:function(bt,Lt,un){(xe!==bt||Je!==Lt||Ve!==un)&&(i.stencilFunc(bt,Lt,un),xe=bt,Je=Lt,Ve=un)},setOp:function(bt,Lt,un){(vt!==bt||_t!==Lt||Bt!==un)&&(i.stencilOp(bt,Lt,un),vt=bt,_t=Lt,Bt=un)},setLocked:function(bt){O=bt},setClear:function(bt){Jt!==bt&&(i.clearStencil(bt),Jt=bt)},reset:function(){O=!1,pe=null,xe=null,Je=null,Ve=null,vt=null,_t=null,Bt=null,Jt=null}}}let a=new s,c=new r,l=new o,h=new WeakMap,u=new WeakMap,f={},p={},x=new WeakMap,M=[],m=null,d=!1,E=null,y=null,C=null,U=null,T=null,P=null,z=null,b=new qe(0,0,0),R=0,G=!1,$=null,ue=null,N=null,H=null,K=null,ee=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Q=!1,j=0,le=i.getParameter(i.VERSION);le.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(le)[1]),Q=j>=1):le.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(le)[1]),Q=j>=2);let he=null,ve={},J=i.getParameter(i.SCISSOR_BOX),se=i.getParameter(i.VIEWPORT),ye=new Zt().fromArray(J),Ie=new Zt().fromArray(se);function De(O,pe,xe,Je){let Ve=new Uint8Array(4),vt=i.createTexture();i.bindTexture(O,vt),i.texParameteri(O,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(O,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let _t=0;_t<xe;_t++)n&&(O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY)?i.texImage3D(pe,0,i.RGBA,1,1,Je,0,i.RGBA,i.UNSIGNED_BYTE,Ve):i.texImage2D(pe+_t,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Ve);return vt}let et={};et[i.TEXTURE_2D]=De(i.TEXTURE_2D,i.TEXTURE_2D,1),et[i.TEXTURE_CUBE_MAP]=De(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),n&&(et[i.TEXTURE_2D_ARRAY]=De(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),et[i.TEXTURE_3D]=De(i.TEXTURE_3D,i.TEXTURE_3D,1,1)),a.setClear(0,0,0,1),c.setClear(1),l.setClear(0),Ke(i.DEPTH_TEST),c.setFunc(wr),rt(!1),A(vc),Ke(i.CULL_FACE),Ue(si);function Ke(O){f[O]!==!0&&(i.enable(O),f[O]=!0)}function Ge(O){f[O]!==!1&&(i.disable(O),f[O]=!1)}function ft(O,pe){return p[O]!==pe?(i.bindFramebuffer(O,pe),p[O]=pe,n&&(O===i.DRAW_FRAMEBUFFER&&(p[i.FRAMEBUFFER]=pe),O===i.FRAMEBUFFER&&(p[i.DRAW_FRAMEBUFFER]=pe)),!0):!1}function k(O,pe){let xe=M,Je=!1;if(O)if(xe=x.get(pe),xe===void 0&&(xe=[],x.set(pe,xe)),O.isWebGLMultipleRenderTargets){let Ve=O.texture;if(xe.length!==Ve.length||xe[0]!==i.COLOR_ATTACHMENT0){for(let vt=0,_t=Ve.length;vt<_t;vt++)xe[vt]=i.COLOR_ATTACHMENT0+vt;xe.length=Ve.length,Je=!0}}else xe[0]!==i.COLOR_ATTACHMENT0&&(xe[0]=i.COLOR_ATTACHMENT0,Je=!0);else xe[0]!==i.BACK&&(xe[0]=i.BACK,Je=!0);Je&&(t.isWebGL2?i.drawBuffers(xe):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(xe))}function Ft(O){return m!==O?(i.useProgram(O),m=O,!0):!1}let He={[wi]:i.FUNC_ADD,[Zh]:i.FUNC_SUBTRACT,[Jh]:i.FUNC_REVERSE_SUBTRACT};if(n)He[bc]=i.MIN,He[wc]=i.MAX;else{let O=e.get("EXT_blend_minmax");O!==null&&(He[bc]=O.MIN_EXT,He[wc]=O.MAX_EXT)}let Ze={[$h]:i.ZERO,[Kh]:i.ONE,[jh]:i.SRC_COLOR,[no]:i.SRC_ALPHA,[su]:i.SRC_ALPHA_SATURATE,[nu]:i.DST_COLOR,[eu]:i.DST_ALPHA,[Qh]:i.ONE_MINUS_SRC_COLOR,[io]:i.ONE_MINUS_SRC_ALPHA,[iu]:i.ONE_MINUS_DST_COLOR,[tu]:i.ONE_MINUS_DST_ALPHA,[ru]:i.CONSTANT_COLOR,[au]:i.ONE_MINUS_CONSTANT_COLOR,[ou]:i.CONSTANT_ALPHA,[cu]:i.ONE_MINUS_CONSTANT_ALPHA};function Ue(O,pe,xe,Je,Ve,vt,_t,Bt,Jt,bt){if(O===si){d===!0&&(Ge(i.BLEND),d=!1);return}if(d===!1&&(Ke(i.BLEND),d=!0),O!==Yh){if(O!==E||bt!==G){if((y!==wi||T!==wi)&&(i.blendEquation(i.FUNC_ADD),y=wi,T=wi),bt)switch(O){case ss:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Mc:i.blendFunc(i.ONE,i.ONE);break;case Ec:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Sc:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}else switch(O){case ss:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Mc:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case Ec:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Sc:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}C=null,U=null,P=null,z=null,b.set(0,0,0),R=0,E=O,G=bt}return}Ve=Ve||pe,vt=vt||xe,_t=_t||Je,(pe!==y||Ve!==T)&&(i.blendEquationSeparate(He[pe],He[Ve]),y=pe,T=Ve),(xe!==C||Je!==U||vt!==P||_t!==z)&&(i.blendFuncSeparate(Ze[xe],Ze[Je],Ze[vt],Ze[_t]),C=xe,U=Je,P=vt,z=_t),(Bt.equals(b)===!1||Jt!==R)&&(i.blendColor(Bt.r,Bt.g,Bt.b,Jt),b.copy(Bt),R=Jt),E=O,G=!1}function Tt(O,pe){O.side===pn?Ge(i.CULL_FACE):Ke(i.CULL_FACE);let xe=O.side===hn;pe&&(xe=!xe),rt(xe),O.blending===ss&&O.transparent===!1?Ue(si):Ue(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),c.setFunc(O.depthFunc),c.setTest(O.depthTest),c.setMask(O.depthWrite),a.setMask(O.colorWrite);let Je=O.stencilWrite;l.setTest(Je),Je&&(l.setMask(O.stencilWriteMask),l.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),l.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),W(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?Ke(i.SAMPLE_ALPHA_TO_COVERAGE):Ge(i.SAMPLE_ALPHA_TO_COVERAGE)}function rt(O){$!==O&&(O?i.frontFace(i.CW):i.frontFace(i.CCW),$=O)}function A(O){O!==Xh?(Ke(i.CULL_FACE),O!==ue&&(O===vc?i.cullFace(i.BACK):O===qh?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ge(i.CULL_FACE),ue=O}function S(O){O!==N&&(Q&&i.lineWidth(O),N=O)}function W(O,pe,xe){O?(Ke(i.POLYGON_OFFSET_FILL),(H!==pe||K!==xe)&&(i.polygonOffset(pe,xe),H=pe,K=xe)):Ge(i.POLYGON_OFFSET_FILL)}function re(O){O?Ke(i.SCISSOR_TEST):Ge(i.SCISSOR_TEST)}function te(O){O===void 0&&(O=i.TEXTURE0+ee-1),he!==O&&(i.activeTexture(O),he=O)}function ae(O,pe,xe){xe===void 0&&(he===null?xe=i.TEXTURE0+ee-1:xe=he);let Je=ve[xe];Je===void 0&&(Je={type:void 0,texture:void 0},ve[xe]=Je),(Je.type!==O||Je.texture!==pe)&&(he!==xe&&(i.activeTexture(xe),he=xe),i.bindTexture(O,pe||et[O]),Je.type=O,Je.texture=pe)}function Ee(){let O=ve[he];O!==void 0&&O.type!==void 0&&(i.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function _e(){try{i.compressedTexImage2D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function oe(){try{i.compressedTexImage3D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function We(){try{i.texSubImage2D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function nt(){try{i.texSubImage3D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ce(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function yt(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function lt(){try{i.texStorage2D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ze(){try{i.texStorage3D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ke(){try{i.texImage2D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function Te(){try{i.texImage3D.apply(i,arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function at(O){ye.equals(O)===!1&&(i.scissor(O.x,O.y,O.z,O.w),ye.copy(O))}function gt(O){Ie.equals(O)===!1&&(i.viewport(O.x,O.y,O.z,O.w),Ie.copy(O))}function At(O,pe){let xe=u.get(pe);xe===void 0&&(xe=new WeakMap,u.set(pe,xe));let Je=xe.get(O);Je===void 0&&(Je=i.getUniformBlockIndex(pe,O.name),xe.set(O,Je))}function dt(O,pe){let Je=u.get(pe).get(O);h.get(pe)!==Je&&(i.uniformBlockBinding(pe,Je,O.__bindingPointIndex),h.set(pe,Je))}function fe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),n===!0&&(i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null)),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),f={},he=null,ve={},p={},x=new WeakMap,M=[],m=null,d=!1,E=null,y=null,C=null,U=null,T=null,P=null,z=null,b=new qe(0,0,0),R=0,G=!1,$=null,ue=null,N=null,H=null,K=null,ye.set(0,0,i.canvas.width,i.canvas.height),Ie.set(0,0,i.canvas.width,i.canvas.height),a.reset(),c.reset(),l.reset()}return{buffers:{color:a,depth:c,stencil:l},enable:Ke,disable:Ge,bindFramebuffer:ft,drawBuffers:k,useProgram:Ft,setBlending:Ue,setMaterial:Tt,setFlipSided:rt,setCullFace:A,setLineWidth:S,setPolygonOffset:W,setScissorTest:re,activeTexture:te,bindTexture:ae,unbindTexture:Ee,compressedTexImage2D:_e,compressedTexImage3D:oe,texImage2D:ke,texImage3D:Te,updateUBOMapping:At,uniformBlockBinding:dt,texStorage2D:lt,texStorage3D:ze,texSubImage2D:We,texSubImage3D:nt,compressedTexSubImage2D:ce,compressedTexSubImage3D:yt,scissor:at,viewport:gt,reset:fe}}function Ig(i,e,t,n,s,r,o){let a=s.isWebGL2,c=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap,u,f=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(A,S){return p?new OffscreenCanvas(A,S):Ir("canvas")}function M(A,S,W,re){let te=1;if((A.width>re||A.height>re)&&(te=re/Math.max(A.width,A.height)),te<1||S===!0)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap){let ae=S?lo:Math.floor,Ee=ae(te*A.width),_e=ae(te*A.height);u===void 0&&(u=x(Ee,_e));let oe=W?x(Ee,_e):u;return oe.width=Ee,oe.height=_e,oe.getContext("2d").drawImage(A,0,0,Ee,_e),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+A.width+"x"+A.height+") to ("+Ee+"x"+_e+")."),oe}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+A.width+"x"+A.height+")."),A;return A}function m(A){return sl(A.width)&&sl(A.height)}function d(A){return a?!1:A.wrapS!==An||A.wrapT!==An||A.minFilter!==sn&&A.minFilter!==_n}function E(A,S){return A.generateMipmaps&&S&&A.minFilter!==sn&&A.minFilter!==_n}function y(A){i.generateMipmap(A)}function C(A,S,W,re,te=!1){if(a===!1)return S;if(A!==null){if(i[A]!==void 0)return i[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let ae=S;if(S===i.RED&&(W===i.FLOAT&&(ae=i.R32F),W===i.HALF_FLOAT&&(ae=i.R16F),W===i.UNSIGNED_BYTE&&(ae=i.R8)),S===i.RED_INTEGER&&(W===i.UNSIGNED_BYTE&&(ae=i.R8UI),W===i.UNSIGNED_SHORT&&(ae=i.R16UI),W===i.UNSIGNED_INT&&(ae=i.R32UI),W===i.BYTE&&(ae=i.R8I),W===i.SHORT&&(ae=i.R16I),W===i.INT&&(ae=i.R32I)),S===i.RG&&(W===i.FLOAT&&(ae=i.RG32F),W===i.HALF_FLOAT&&(ae=i.RG16F),W===i.UNSIGNED_BYTE&&(ae=i.RG8)),S===i.RGBA){let Ee=te?Rr:wt.getTransfer(re);W===i.FLOAT&&(ae=i.RGBA32F),W===i.HALF_FLOAT&&(ae=i.RGBA16F),W===i.UNSIGNED_BYTE&&(ae=Ee===Pt?i.SRGB8_ALPHA8:i.RGBA8),W===i.UNSIGNED_SHORT_4_4_4_4&&(ae=i.RGBA4),W===i.UNSIGNED_SHORT_5_5_5_1&&(ae=i.RGB5_A1)}return(ae===i.R16F||ae===i.R32F||ae===i.RG16F||ae===i.RG32F||ae===i.RGBA16F||ae===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ae}function U(A,S,W){return E(A,W)===!0||A.isFramebufferTexture&&A.minFilter!==sn&&A.minFilter!==_n?Math.log2(Math.max(S.width,S.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?S.mipmaps.length:1}function T(A){return A===sn||A===Tc||A===Ma?i.NEAREST:i.LINEAR}function P(A){let S=A.target;S.removeEventListener("dispose",P),b(S),S.isVideoTexture&&h.delete(S)}function z(A){let S=A.target;S.removeEventListener("dispose",z),G(S)}function b(A){let S=n.get(A);if(S.__webglInit===void 0)return;let W=A.source,re=f.get(W);if(re){let te=re[S.__cacheKey];te.usedTimes--,te.usedTimes===0&&R(A),Object.keys(re).length===0&&f.delete(W)}n.remove(A)}function R(A){let S=n.get(A);i.deleteTexture(S.__webglTexture);let W=A.source,re=f.get(W);delete re[S.__cacheKey],o.memory.textures--}function G(A){let S=A.texture,W=n.get(A),re=n.get(S);if(re.__webglTexture!==void 0&&(i.deleteTexture(re.__webglTexture),o.memory.textures--),A.depthTexture&&A.depthTexture.dispose(),A.isWebGLCubeRenderTarget)for(let te=0;te<6;te++){if(Array.isArray(W.__webglFramebuffer[te]))for(let ae=0;ae<W.__webglFramebuffer[te].length;ae++)i.deleteFramebuffer(W.__webglFramebuffer[te][ae]);else i.deleteFramebuffer(W.__webglFramebuffer[te]);W.__webglDepthbuffer&&i.deleteRenderbuffer(W.__webglDepthbuffer[te])}else{if(Array.isArray(W.__webglFramebuffer))for(let te=0;te<W.__webglFramebuffer.length;te++)i.deleteFramebuffer(W.__webglFramebuffer[te]);else i.deleteFramebuffer(W.__webglFramebuffer);if(W.__webglDepthbuffer&&i.deleteRenderbuffer(W.__webglDepthbuffer),W.__webglMultisampledFramebuffer&&i.deleteFramebuffer(W.__webglMultisampledFramebuffer),W.__webglColorRenderbuffer)for(let te=0;te<W.__webglColorRenderbuffer.length;te++)W.__webglColorRenderbuffer[te]&&i.deleteRenderbuffer(W.__webglColorRenderbuffer[te]);W.__webglDepthRenderbuffer&&i.deleteRenderbuffer(W.__webglDepthRenderbuffer)}if(A.isWebGLMultipleRenderTargets)for(let te=0,ae=S.length;te<ae;te++){let Ee=n.get(S[te]);Ee.__webglTexture&&(i.deleteTexture(Ee.__webglTexture),o.memory.textures--),n.remove(S[te])}n.remove(S),n.remove(A)}let $=0;function ue(){$=0}function N(){let A=$;return A>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),$+=1,A}function H(A){let S=[];return S.push(A.wrapS),S.push(A.wrapT),S.push(A.wrapR||0),S.push(A.magFilter),S.push(A.minFilter),S.push(A.anisotropy),S.push(A.internalFormat),S.push(A.format),S.push(A.type),S.push(A.generateMipmaps),S.push(A.premultiplyAlpha),S.push(A.flipY),S.push(A.unpackAlignment),S.push(A.colorSpace),S.join()}function K(A,S){let W=n.get(A);if(A.isVideoTexture&&Tt(A),A.isRenderTargetTexture===!1&&A.version>0&&W.__version!==A.version){let re=A.image;if(re===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(re.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ye(W,A,S);return}}t.bindTexture(i.TEXTURE_2D,W.__webglTexture,i.TEXTURE0+S)}function ee(A,S){let W=n.get(A);if(A.version>0&&W.__version!==A.version){ye(W,A,S);return}t.bindTexture(i.TEXTURE_2D_ARRAY,W.__webglTexture,i.TEXTURE0+S)}function Q(A,S){let W=n.get(A);if(A.version>0&&W.__version!==A.version){ye(W,A,S);return}t.bindTexture(i.TEXTURE_3D,W.__webglTexture,i.TEXTURE0+S)}function j(A,S){let W=n.get(A);if(A.version>0&&W.__version!==A.version){Ie(W,A,S);return}t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture,i.TEXTURE0+S)}let le={[ls]:i.REPEAT,[An]:i.CLAMP_TO_EDGE,[ao]:i.MIRRORED_REPEAT},he={[sn]:i.NEAREST,[Tc]:i.NEAREST_MIPMAP_NEAREST,[Ma]:i.NEAREST_MIPMAP_LINEAR,[_n]:i.LINEAR,[bu]:i.LINEAR_MIPMAP_NEAREST,[Os]:i.LINEAR_MIPMAP_LINEAR},ve={[Ou]:i.NEVER,[Gu]:i.ALWAYS,[Fu]:i.LESS,[sh]:i.LEQUAL,[Bu]:i.EQUAL,[Vu]:i.GEQUAL,[Hu]:i.GREATER,[zu]:i.NOTEQUAL};function J(A,S,W){if(W?(i.texParameteri(A,i.TEXTURE_WRAP_S,le[S.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,le[S.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,le[S.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,he[S.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,he[S.minFilter])):(i.texParameteri(A,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(A,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,i.CLAMP_TO_EDGE),(S.wrapS!==An||S.wrapT!==An)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),i.texParameteri(A,i.TEXTURE_MAG_FILTER,T(S.magFilter)),i.texParameteri(A,i.TEXTURE_MIN_FILTER,T(S.minFilter)),S.minFilter!==sn&&S.minFilter!==_n&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),S.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,ve[S.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){let re=e.get("EXT_texture_filter_anisotropic");if(S.magFilter===sn||S.minFilter!==Ma&&S.minFilter!==Os||S.type===ii&&e.has("OES_texture_float_linear")===!1||a===!1&&S.type===Fs&&e.has("OES_texture_half_float_linear")===!1)return;(S.anisotropy>1||n.get(S).__currentAnisotropy)&&(i.texParameterf(A,re.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,s.getMaxAnisotropy())),n.get(S).__currentAnisotropy=S.anisotropy)}}function se(A,S){let W=!1;A.__webglInit===void 0&&(A.__webglInit=!0,S.addEventListener("dispose",P));let re=S.source,te=f.get(re);te===void 0&&(te={},f.set(re,te));let ae=H(S);if(ae!==A.__cacheKey){te[ae]===void 0&&(te[ae]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,W=!0),te[ae].usedTimes++;let Ee=te[A.__cacheKey];Ee!==void 0&&(te[A.__cacheKey].usedTimes--,Ee.usedTimes===0&&R(S)),A.__cacheKey=ae,A.__webglTexture=te[ae].texture}return W}function ye(A,S,W){let re=i.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(re=i.TEXTURE_2D_ARRAY),S.isData3DTexture&&(re=i.TEXTURE_3D);let te=se(A,S),ae=S.source;t.bindTexture(re,A.__webglTexture,i.TEXTURE0+W);let Ee=n.get(ae);if(ae.version!==Ee.__version||te===!0){t.activeTexture(i.TEXTURE0+W);let _e=wt.getPrimaries(wt.workingColorSpace),oe=S.colorSpace===xn?null:wt.getPrimaries(S.colorSpace),We=S.colorSpace===xn||_e===oe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,We);let nt=d(S)&&m(S.image)===!1,ce=M(S.image,nt,!1,s.maxTextureSize);ce=rt(S,ce);let yt=m(ce)||a,lt=r.convert(S.format,S.colorSpace),ze=r.convert(S.type),ke=C(S.internalFormat,lt,ze,S.colorSpace,S.isVideoTexture);J(re,S,yt);let Te,at=S.mipmaps,gt=a&&S.isVideoTexture!==!0&&ke!==th,At=Ee.__version===void 0||te===!0,dt=U(S,ce,yt);if(S.isDepthTexture)ke=i.DEPTH_COMPONENT,a?S.type===ii?ke=i.DEPTH_COMPONENT32F:S.type===ni?ke=i.DEPTH_COMPONENT24:S.type===Ai?ke=i.DEPTH24_STENCIL8:ke=i.DEPTH_COMPONENT16:S.type===ii&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),S.format===Ri&&ke===i.DEPTH_COMPONENT&&S.type!==Zo&&S.type!==ni&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),S.type=ni,ze=r.convert(S.type)),S.format===hs&&ke===i.DEPTH_COMPONENT&&(ke=i.DEPTH_STENCIL,S.type!==Ai&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),S.type=Ai,ze=r.convert(S.type))),At&&(gt?t.texStorage2D(i.TEXTURE_2D,1,ke,ce.width,ce.height):t.texImage2D(i.TEXTURE_2D,0,ke,ce.width,ce.height,0,lt,ze,null));else if(S.isDataTexture)if(at.length>0&&yt){gt&&At&&t.texStorage2D(i.TEXTURE_2D,dt,ke,at[0].width,at[0].height);for(let fe=0,O=at.length;fe<O;fe++)Te=at[fe],gt?t.texSubImage2D(i.TEXTURE_2D,fe,0,0,Te.width,Te.height,lt,ze,Te.data):t.texImage2D(i.TEXTURE_2D,fe,ke,Te.width,Te.height,0,lt,ze,Te.data);S.generateMipmaps=!1}else gt?(At&&t.texStorage2D(i.TEXTURE_2D,dt,ke,ce.width,ce.height),t.texSubImage2D(i.TEXTURE_2D,0,0,0,ce.width,ce.height,lt,ze,ce.data)):t.texImage2D(i.TEXTURE_2D,0,ke,ce.width,ce.height,0,lt,ze,ce.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){gt&&At&&t.texStorage3D(i.TEXTURE_2D_ARRAY,dt,ke,at[0].width,at[0].height,ce.depth);for(let fe=0,O=at.length;fe<O;fe++)Te=at[fe],S.format!==Rn?lt!==null?gt?t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,fe,0,0,0,Te.width,Te.height,ce.depth,lt,Te.data,0,0):t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,fe,ke,Te.width,Te.height,ce.depth,0,Te.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):gt?t.texSubImage3D(i.TEXTURE_2D_ARRAY,fe,0,0,0,Te.width,Te.height,ce.depth,lt,ze,Te.data):t.texImage3D(i.TEXTURE_2D_ARRAY,fe,ke,Te.width,Te.height,ce.depth,0,lt,ze,Te.data)}else{gt&&At&&t.texStorage2D(i.TEXTURE_2D,dt,ke,at[0].width,at[0].height);for(let fe=0,O=at.length;fe<O;fe++)Te=at[fe],S.format!==Rn?lt!==null?gt?t.compressedTexSubImage2D(i.TEXTURE_2D,fe,0,0,Te.width,Te.height,lt,Te.data):t.compressedTexImage2D(i.TEXTURE_2D,fe,ke,Te.width,Te.height,0,Te.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):gt?t.texSubImage2D(i.TEXTURE_2D,fe,0,0,Te.width,Te.height,lt,ze,Te.data):t.texImage2D(i.TEXTURE_2D,fe,ke,Te.width,Te.height,0,lt,ze,Te.data)}else if(S.isDataArrayTexture)gt?(At&&t.texStorage3D(i.TEXTURE_2D_ARRAY,dt,ke,ce.width,ce.height,ce.depth),t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ce.width,ce.height,ce.depth,lt,ze,ce.data)):t.texImage3D(i.TEXTURE_2D_ARRAY,0,ke,ce.width,ce.height,ce.depth,0,lt,ze,ce.data);else if(S.isData3DTexture)gt?(At&&t.texStorage3D(i.TEXTURE_3D,dt,ke,ce.width,ce.height,ce.depth),t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ce.width,ce.height,ce.depth,lt,ze,ce.data)):t.texImage3D(i.TEXTURE_3D,0,ke,ce.width,ce.height,ce.depth,0,lt,ze,ce.data);else if(S.isFramebufferTexture){if(At)if(gt)t.texStorage2D(i.TEXTURE_2D,dt,ke,ce.width,ce.height);else{let fe=ce.width,O=ce.height;for(let pe=0;pe<dt;pe++)t.texImage2D(i.TEXTURE_2D,pe,ke,fe,O,0,lt,ze,null),fe>>=1,O>>=1}}else if(at.length>0&&yt){gt&&At&&t.texStorage2D(i.TEXTURE_2D,dt,ke,at[0].width,at[0].height);for(let fe=0,O=at.length;fe<O;fe++)Te=at[fe],gt?t.texSubImage2D(i.TEXTURE_2D,fe,0,0,lt,ze,Te):t.texImage2D(i.TEXTURE_2D,fe,ke,lt,ze,Te);S.generateMipmaps=!1}else gt?(At&&t.texStorage2D(i.TEXTURE_2D,dt,ke,ce.width,ce.height),t.texSubImage2D(i.TEXTURE_2D,0,0,0,lt,ze,ce)):t.texImage2D(i.TEXTURE_2D,0,ke,lt,ze,ce);E(S,yt)&&y(re),Ee.__version=ae.version,S.onUpdate&&S.onUpdate(S)}A.__version=S.version}function Ie(A,S,W){if(S.image.length!==6)return;let re=se(A,S),te=S.source;t.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+W);let ae=n.get(te);if(te.version!==ae.__version||re===!0){t.activeTexture(i.TEXTURE0+W);let Ee=wt.getPrimaries(wt.workingColorSpace),_e=S.colorSpace===xn?null:wt.getPrimaries(S.colorSpace),oe=S.colorSpace===xn||Ee===_e?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,oe);let We=S.isCompressedTexture||S.image[0].isCompressedTexture,nt=S.image[0]&&S.image[0].isDataTexture,ce=[];for(let fe=0;fe<6;fe++)!We&&!nt?ce[fe]=M(S.image[fe],!1,!0,s.maxCubemapSize):ce[fe]=nt?S.image[fe].image:S.image[fe],ce[fe]=rt(S,ce[fe]);let yt=ce[0],lt=m(yt)||a,ze=r.convert(S.format,S.colorSpace),ke=r.convert(S.type),Te=C(S.internalFormat,ze,ke,S.colorSpace),at=a&&S.isVideoTexture!==!0,gt=ae.__version===void 0||re===!0,At=U(S,yt,lt);J(i.TEXTURE_CUBE_MAP,S,lt);let dt;if(We){at&&gt&&t.texStorage2D(i.TEXTURE_CUBE_MAP,At,Te,yt.width,yt.height);for(let fe=0;fe<6;fe++){dt=ce[fe].mipmaps;for(let O=0;O<dt.length;O++){let pe=dt[O];S.format!==Rn?ze!==null?at?t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O,0,0,pe.width,pe.height,ze,pe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O,Te,pe.width,pe.height,0,pe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):at?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O,0,0,pe.width,pe.height,ze,ke,pe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O,Te,pe.width,pe.height,0,ze,ke,pe.data)}}}else{dt=S.mipmaps,at&&gt&&(dt.length>0&&At++,t.texStorage2D(i.TEXTURE_CUBE_MAP,At,Te,ce[0].width,ce[0].height));for(let fe=0;fe<6;fe++)if(nt){at?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,ce[fe].width,ce[fe].height,ze,ke,ce[fe].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,Te,ce[fe].width,ce[fe].height,0,ze,ke,ce[fe].data);for(let O=0;O<dt.length;O++){let xe=dt[O].image[fe].image;at?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O+1,0,0,xe.width,xe.height,ze,ke,xe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O+1,Te,xe.width,xe.height,0,ze,ke,xe.data)}}else{at?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,ze,ke,ce[fe]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,Te,ze,ke,ce[fe]);for(let O=0;O<dt.length;O++){let pe=dt[O];at?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O+1,0,0,ze,ke,pe.image[fe]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,O+1,Te,ze,ke,pe.image[fe])}}}E(S,lt)&&y(i.TEXTURE_CUBE_MAP),ae.__version=te.version,S.onUpdate&&S.onUpdate(S)}A.__version=S.version}function De(A,S,W,re,te,ae){let Ee=r.convert(W.format,W.colorSpace),_e=r.convert(W.type),oe=C(W.internalFormat,Ee,_e,W.colorSpace);if(!n.get(S).__hasExternalTextures){let nt=Math.max(1,S.width>>ae),ce=Math.max(1,S.height>>ae);te===i.TEXTURE_3D||te===i.TEXTURE_2D_ARRAY?t.texImage3D(te,ae,oe,nt,ce,S.depth,0,Ee,_e,null):t.texImage2D(te,ae,oe,nt,ce,0,Ee,_e,null)}t.bindFramebuffer(i.FRAMEBUFFER,A),Ue(S)?c.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,re,te,n.get(W).__webglTexture,0,Ze(S)):(te===i.TEXTURE_2D||te>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&te<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,re,te,n.get(W).__webglTexture,ae),t.bindFramebuffer(i.FRAMEBUFFER,null)}function et(A,S,W){if(i.bindRenderbuffer(i.RENDERBUFFER,A),S.depthBuffer&&!S.stencilBuffer){let re=a===!0?i.DEPTH_COMPONENT24:i.DEPTH_COMPONENT16;if(W||Ue(S)){let te=S.depthTexture;te&&te.isDepthTexture&&(te.type===ii?re=i.DEPTH_COMPONENT32F:te.type===ni&&(re=i.DEPTH_COMPONENT24));let ae=Ze(S);Ue(S)?c.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ae,re,S.width,S.height):i.renderbufferStorageMultisample(i.RENDERBUFFER,ae,re,S.width,S.height)}else i.renderbufferStorage(i.RENDERBUFFER,re,S.width,S.height);i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.RENDERBUFFER,A)}else if(S.depthBuffer&&S.stencilBuffer){let re=Ze(S);W&&Ue(S)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,re,i.DEPTH24_STENCIL8,S.width,S.height):Ue(S)?c.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,re,i.DEPTH24_STENCIL8,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,i.DEPTH_STENCIL,S.width,S.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.RENDERBUFFER,A)}else{let re=S.isWebGLMultipleRenderTargets===!0?S.texture:[S.texture];for(let te=0;te<re.length;te++){let ae=re[te],Ee=r.convert(ae.format,ae.colorSpace),_e=r.convert(ae.type),oe=C(ae.internalFormat,Ee,_e,ae.colorSpace),We=Ze(S);W&&Ue(S)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,We,oe,S.width,S.height):Ue(S)?c.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,We,oe,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,oe,S.width,S.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ke(A,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,A),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(S.depthTexture).__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),K(S.depthTexture,0);let re=n.get(S.depthTexture).__webglTexture,te=Ze(S);if(S.depthTexture.format===Ri)Ue(S)?c.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,re,0,te):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,re,0);else if(S.depthTexture.format===hs)Ue(S)?c.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,re,0,te):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,re,0);else throw new Error("Unknown depthTexture format")}function Ge(A){let S=n.get(A),W=A.isWebGLCubeRenderTarget===!0;if(A.depthTexture&&!S.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");Ke(S.__webglFramebuffer,A)}else if(W){S.__webglDepthbuffer=[];for(let re=0;re<6;re++)t.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer[re]),S.__webglDepthbuffer[re]=i.createRenderbuffer(),et(S.__webglDepthbuffer[re],A,!1)}else t.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer=i.createRenderbuffer(),et(S.__webglDepthbuffer,A,!1);t.bindFramebuffer(i.FRAMEBUFFER,null)}function ft(A,S,W){let re=n.get(A);S!==void 0&&De(re.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),W!==void 0&&Ge(A)}function k(A){let S=A.texture,W=n.get(A),re=n.get(S);A.addEventListener("dispose",z),A.isWebGLMultipleRenderTargets!==!0&&(re.__webglTexture===void 0&&(re.__webglTexture=i.createTexture()),re.__version=S.version,o.memory.textures++);let te=A.isWebGLCubeRenderTarget===!0,ae=A.isWebGLMultipleRenderTargets===!0,Ee=m(A)||a;if(te){W.__webglFramebuffer=[];for(let _e=0;_e<6;_e++)if(a&&S.mipmaps&&S.mipmaps.length>0){W.__webglFramebuffer[_e]=[];for(let oe=0;oe<S.mipmaps.length;oe++)W.__webglFramebuffer[_e][oe]=i.createFramebuffer()}else W.__webglFramebuffer[_e]=i.createFramebuffer()}else{if(a&&S.mipmaps&&S.mipmaps.length>0){W.__webglFramebuffer=[];for(let _e=0;_e<S.mipmaps.length;_e++)W.__webglFramebuffer[_e]=i.createFramebuffer()}else W.__webglFramebuffer=i.createFramebuffer();if(ae)if(s.drawBuffers){let _e=A.texture;for(let oe=0,We=_e.length;oe<We;oe++){let nt=n.get(_e[oe]);nt.__webglTexture===void 0&&(nt.__webglTexture=i.createTexture(),o.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(a&&A.samples>0&&Ue(A)===!1){let _e=ae?S:[S];W.__webglMultisampledFramebuffer=i.createFramebuffer(),W.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let oe=0;oe<_e.length;oe++){let We=_e[oe];W.__webglColorRenderbuffer[oe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,W.__webglColorRenderbuffer[oe]);let nt=r.convert(We.format,We.colorSpace),ce=r.convert(We.type),yt=C(We.internalFormat,nt,ce,We.colorSpace,A.isXRRenderTarget===!0),lt=Ze(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,lt,yt,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+oe,i.RENDERBUFFER,W.__webglColorRenderbuffer[oe])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(W.__webglDepthRenderbuffer=i.createRenderbuffer(),et(W.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(te){t.bindTexture(i.TEXTURE_CUBE_MAP,re.__webglTexture),J(i.TEXTURE_CUBE_MAP,S,Ee);for(let _e=0;_e<6;_e++)if(a&&S.mipmaps&&S.mipmaps.length>0)for(let oe=0;oe<S.mipmaps.length;oe++)De(W.__webglFramebuffer[_e][oe],A,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,oe);else De(W.__webglFramebuffer[_e],A,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0);E(S,Ee)&&y(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ae){let _e=A.texture;for(let oe=0,We=_e.length;oe<We;oe++){let nt=_e[oe],ce=n.get(nt);t.bindTexture(i.TEXTURE_2D,ce.__webglTexture),J(i.TEXTURE_2D,nt,Ee),De(W.__webglFramebuffer,A,nt,i.COLOR_ATTACHMENT0+oe,i.TEXTURE_2D,0),E(nt,Ee)&&y(i.TEXTURE_2D)}t.unbindTexture()}else{let _e=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(a?_e=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(_e,re.__webglTexture),J(_e,S,Ee),a&&S.mipmaps&&S.mipmaps.length>0)for(let oe=0;oe<S.mipmaps.length;oe++)De(W.__webglFramebuffer[oe],A,S,i.COLOR_ATTACHMENT0,_e,oe);else De(W.__webglFramebuffer,A,S,i.COLOR_ATTACHMENT0,_e,0);E(S,Ee)&&y(_e),t.unbindTexture()}A.depthBuffer&&Ge(A)}function Ft(A){let S=m(A)||a,W=A.isWebGLMultipleRenderTargets===!0?A.texture:[A.texture];for(let re=0,te=W.length;re<te;re++){let ae=W[re];if(E(ae,S)){let Ee=A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:i.TEXTURE_2D,_e=n.get(ae).__webglTexture;t.bindTexture(Ee,_e),y(Ee),t.unbindTexture()}}}function He(A){if(a&&A.samples>0&&Ue(A)===!1){let S=A.isWebGLMultipleRenderTargets?A.texture:[A.texture],W=A.width,re=A.height,te=i.COLOR_BUFFER_BIT,ae=[],Ee=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,_e=n.get(A),oe=A.isWebGLMultipleRenderTargets===!0;if(oe)for(let We=0;We<S.length;We++)t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+We,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+We,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,_e.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,_e.__webglFramebuffer);for(let We=0;We<S.length;We++){ae.push(i.COLOR_ATTACHMENT0+We),A.depthBuffer&&ae.push(Ee);let nt=_e.__ignoreDepthValues!==void 0?_e.__ignoreDepthValues:!1;if(nt===!1&&(A.depthBuffer&&(te|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&(te|=i.STENCIL_BUFFER_BIT)),oe&&i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,_e.__webglColorRenderbuffer[We]),nt===!0&&(i.invalidateFramebuffer(i.READ_FRAMEBUFFER,[Ee]),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[Ee])),oe){let ce=n.get(S[We]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ce,0)}i.blitFramebuffer(0,0,W,re,0,0,W,re,te,i.NEAREST),l&&i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ae)}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),oe)for(let We=0;We<S.length;We++){t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+We,i.RENDERBUFFER,_e.__webglColorRenderbuffer[We]);let nt=n.get(S[We]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,_e.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+We,i.TEXTURE_2D,nt,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,_e.__webglMultisampledFramebuffer)}}function Ze(A){return Math.min(s.maxSamples,A.samples)}function Ue(A){let S=n.get(A);return a&&A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function Tt(A){let S=o.render.frame;h.get(A)!==S&&(h.set(A,S),A.update())}function rt(A,S){let W=A.colorSpace,re=A.format,te=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||A.format===oo||W!==Xn&&W!==xn&&(wt.getTransfer(W)===Pt?a===!1?e.has("EXT_sRGB")===!0&&re===Rn?(A.format=oo,A.minFilter=_n,A.generateMipmaps=!1):S=Dr.sRGBToLinear(S):(re!==Rn||te!==ai)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),S}this.allocateTextureUnit=N,this.resetTextureUnits=ue,this.setTexture2D=K,this.setTexture2DArray=ee,this.setTexture3D=Q,this.setTextureCube=j,this.rebindTextures=ft,this.setupRenderTarget=k,this.updateRenderTargetMipmap=Ft,this.updateMultisampleRenderTarget=He,this.setupDepthRenderbuffer=Ge,this.setupFrameBufferTexture=De,this.useMultisampledRTT=Ue}function Dg(i,e,t){let n=t.isWebGL2;function s(r,o=xn){let a,c=wt.getTransfer(o);if(r===ai)return i.UNSIGNED_BYTE;if(r===$l)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Kl)return i.UNSIGNED_SHORT_5_5_5_1;if(r===wu)return i.BYTE;if(r===Tu)return i.SHORT;if(r===Zo)return i.UNSIGNED_SHORT;if(r===Jl)return i.INT;if(r===ni)return i.UNSIGNED_INT;if(r===ii)return i.FLOAT;if(r===Fs)return n?i.HALF_FLOAT:(a=e.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(r===Au)return i.ALPHA;if(r===Rn)return i.RGBA;if(r===Ru)return i.LUMINANCE;if(r===Cu)return i.LUMINANCE_ALPHA;if(r===Ri)return i.DEPTH_COMPONENT;if(r===hs)return i.DEPTH_STENCIL;if(r===oo)return a=e.get("EXT_sRGB"),a!==null?a.SRGB_ALPHA_EXT:null;if(r===Pu)return i.RED;if(r===jl)return i.RED_INTEGER;if(r===Lu)return i.RG;if(r===Ql)return i.RG_INTEGER;if(r===eh)return i.RGBA_INTEGER;if(r===Ea||r===Sa||r===ba||r===wa)if(c===Pt)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(r===Ea)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Sa)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===ba)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===wa)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(r===Ea)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Sa)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===ba)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===wa)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Ac||r===Rc||r===Cc||r===Pc)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(r===Ac)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Rc)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Cc)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Pc)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===th)return a=e.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if(r===Lc||r===Ic)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(r===Lc)return c===Pt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(r===Ic)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(r===Dc||r===Uc||r===Nc||r===Oc||r===Fc||r===Bc||r===Hc||r===zc||r===Vc||r===Gc||r===kc||r===Wc||r===Xc||r===qc)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(r===Dc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Uc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Nc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Oc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Fc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===Bc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Hc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===zc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Vc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Gc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===kc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Wc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Xc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===qc)return c===Pt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===Ta||r===Yc||r===Zc)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(r===Ta)return c===Pt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Yc)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Zc)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Iu||r===Jc||r===$c||r===Kc)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(r===Ta)return a.COMPRESSED_RED_RGTC1_EXT;if(r===Jc)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===$c)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===Kc)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Ai?n?i.UNSIGNED_INT_24_8:(a=e.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null):i[r]!==void 0?i[r]:null}return{convert:s}}var So=class extends rn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},ct=class extends an{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ug={type:"move"},Ds=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ct,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ct,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ct,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(let M of e.hand.values()){let m=t.getJointPose(M,n),d=this._getHandJoint(l,M);m!==null&&(d.matrix.fromArray(m.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=m.radius),d.visible=m!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),p=.02,x=.005;l.inputState.pinching&&f>p+x?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=p-x&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ug)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new ct;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},bo=class extends ci{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,f=null,p=null,x=null,M=t.getContextAttributes(),m=null,d=null,E=[],y=[],C=new we,U=null,T=new rn;T.layers.enable(1),T.viewport=new Zt;let P=new rn;P.layers.enable(2),P.viewport=new Zt;let z=[T,P],b=new So;b.layers.enable(1),b.layers.enable(2);let R=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(J){let se=E[J];return se===void 0&&(se=new Ds,E[J]=se),se.getTargetRaySpace()},this.getControllerGrip=function(J){let se=E[J];return se===void 0&&(se=new Ds,E[J]=se),se.getGripSpace()},this.getHand=function(J){let se=E[J];return se===void 0&&(se=new Ds,E[J]=se),se.getHandSpace()};function $(J){let se=y.indexOf(J.inputSource);if(se===-1)return;let ye=E[se];ye!==void 0&&(ye.update(J.inputSource,J.frame,l||o),ye.dispatchEvent({type:J.type,data:J.inputSource}))}function ue(){s.removeEventListener("select",$),s.removeEventListener("selectstart",$),s.removeEventListener("selectend",$),s.removeEventListener("squeeze",$),s.removeEventListener("squeezestart",$),s.removeEventListener("squeezeend",$),s.removeEventListener("end",ue),s.removeEventListener("inputsourceschange",N);for(let J=0;J<E.length;J++){let se=y[J];se!==null&&(y[J]=null,E[J].disconnect(se))}R=null,G=null,e.setRenderTarget(m),p=null,f=null,u=null,s=null,d=null,ve.stop(),n.isPresenting=!1,e.setPixelRatio(U),e.setSize(C.width,C.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(J){r=J,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(J){a=J,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(J){l=J},this.getBaseLayer=function(){return f!==null?f:p},this.getBinding=function(){return u},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(J){if(s=J,s!==null){if(m=e.getRenderTarget(),s.addEventListener("select",$),s.addEventListener("selectstart",$),s.addEventListener("selectend",$),s.addEventListener("squeeze",$),s.addEventListener("squeezestart",$),s.addEventListener("squeezeend",$),s.addEventListener("end",ue),s.addEventListener("inputsourceschange",N),M.xrCompatible!==!0&&await t.makeXRCompatible(),U=e.getPixelRatio(),e.getSize(C),s.renderState.layers===void 0||e.capabilities.isWebGL2===!1){let se={antialias:s.renderState.layers===void 0?M.antialias:!0,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,t,se),s.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),d=new qn(p.framebufferWidth,p.framebufferHeight,{format:Rn,type:ai,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil})}else{let se=null,ye=null,Ie=null;M.depth&&(Ie=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,se=M.stencil?hs:Ri,ye=M.stencil?Ai:ni);let De={colorFormat:t.RGBA8,depthFormat:Ie,scaleFactor:r};u=new XRWebGLBinding(s,t),f=u.createProjectionLayer(De),s.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),d=new qn(f.textureWidth,f.textureHeight,{format:Rn,type:ai,depthTexture:new Wr(f.textureWidth,f.textureHeight,ye,void 0,void 0,void 0,void 0,void 0,void 0,se),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0});let et=e.properties.get(d);et.__ignoreDepthValues=f.ignoreDepthValues}d.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),ve.setContext(s),ve.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode};function N(J){for(let se=0;se<J.removed.length;se++){let ye=J.removed[se],Ie=y.indexOf(ye);Ie>=0&&(y[Ie]=null,E[Ie].disconnect(ye))}for(let se=0;se<J.added.length;se++){let ye=J.added[se],Ie=y.indexOf(ye);if(Ie===-1){for(let et=0;et<E.length;et++)if(et>=y.length){y.push(ye),Ie=et;break}else if(y[et]===null){y[et]=ye,Ie=et;break}if(Ie===-1)break}let De=E[Ie];De&&De.connect(ye)}}let H=new D,K=new D;function ee(J,se,ye){H.setFromMatrixPosition(se.matrixWorld),K.setFromMatrixPosition(ye.matrixWorld);let Ie=H.distanceTo(K),De=se.projectionMatrix.elements,et=ye.projectionMatrix.elements,Ke=De[14]/(De[10]-1),Ge=De[14]/(De[10]+1),ft=(De[9]+1)/De[5],k=(De[9]-1)/De[5],Ft=(De[8]-1)/De[0],He=(et[8]+1)/et[0],Ze=Ke*Ft,Ue=Ke*He,Tt=Ie/(-Ft+He),rt=Tt*-Ft;se.matrixWorld.decompose(J.position,J.quaternion,J.scale),J.translateX(rt),J.translateZ(Tt),J.matrixWorld.compose(J.position,J.quaternion,J.scale),J.matrixWorldInverse.copy(J.matrixWorld).invert();let A=Ke+Tt,S=Ge+Tt,W=Ze-rt,re=Ue+(Ie-rt),te=ft*Ge/S*A,ae=k*Ge/S*A;J.projectionMatrix.makePerspective(W,re,te,ae,A,S),J.projectionMatrixInverse.copy(J.projectionMatrix).invert()}function Q(J,se){se===null?J.matrixWorld.copy(J.matrix):J.matrixWorld.multiplyMatrices(se.matrixWorld,J.matrix),J.matrixWorldInverse.copy(J.matrixWorld).invert()}this.updateCamera=function(J){if(s===null)return;b.near=P.near=T.near=J.near,b.far=P.far=T.far=J.far,(R!==b.near||G!==b.far)&&(s.updateRenderState({depthNear:b.near,depthFar:b.far}),R=b.near,G=b.far);let se=J.parent,ye=b.cameras;Q(b,se);for(let Ie=0;Ie<ye.length;Ie++)Q(ye[Ie],se);ye.length===2?ee(b,T,P):b.projectionMatrix.copy(T.projectionMatrix),j(J,b,se)};function j(J,se,ye){ye===null?J.matrix.copy(se.matrixWorld):(J.matrix.copy(ye.matrixWorld),J.matrix.invert(),J.matrix.multiply(se.matrixWorld)),J.matrix.decompose(J.position,J.quaternion,J.scale),J.updateMatrixWorld(!0),J.projectionMatrix.copy(se.projectionMatrix),J.projectionMatrixInverse.copy(se.projectionMatrixInverse),J.isPerspectiveCamera&&(J.fov=co*2*Math.atan(1/J.projectionMatrix.elements[5]),J.zoom=1)}this.getCamera=function(){return b},this.getFoveation=function(){if(!(f===null&&p===null))return c},this.setFoveation=function(J){c=J,f!==null&&(f.fixedFoveation=J),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=J)};let le=null;function he(J,se){if(h=se.getViewerPose(l||o),x=se,h!==null){let ye=h.views;p!==null&&(e.setRenderTargetFramebuffer(d,p.framebuffer),e.setRenderTarget(d));let Ie=!1;ye.length!==b.cameras.length&&(b.cameras.length=0,Ie=!0);for(let De=0;De<ye.length;De++){let et=ye[De],Ke=null;if(p!==null)Ke=p.getViewport(et);else{let ft=u.getViewSubImage(f,et);Ke=ft.viewport,De===0&&(e.setRenderTargetTextures(d,ft.colorTexture,f.ignoreDepthValues?void 0:ft.depthStencilTexture),e.setRenderTarget(d))}let Ge=z[De];Ge===void 0&&(Ge=new rn,Ge.layers.enable(De),Ge.viewport=new Zt,z[De]=Ge),Ge.matrix.fromArray(et.transform.matrix),Ge.matrix.decompose(Ge.position,Ge.quaternion,Ge.scale),Ge.projectionMatrix.fromArray(et.projectionMatrix),Ge.projectionMatrixInverse.copy(Ge.projectionMatrix).invert(),Ge.viewport.set(Ke.x,Ke.y,Ke.width,Ke.height),De===0&&(b.matrix.copy(Ge.matrix),b.matrix.decompose(b.position,b.quaternion,b.scale)),Ie===!0&&b.cameras.push(Ge)}}for(let ye=0;ye<E.length;ye++){let Ie=y[ye],De=E[ye];Ie!==null&&De!==void 0&&De.update(Ie,se,l||o)}le&&le(J,se),se.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:se}),x=null}let ve=new ch;ve.setAnimationLoop(he),this.setAnimationLoop=function(J){le=J},this.dispose=function(){}}};function Ng(i,e){function t(m,d){m.matrixAutoUpdate===!0&&m.updateMatrix(),d.value.copy(m.matrix)}function n(m,d){d.color.getRGB(m.fogColor.value,oh(i)),d.isFog?(m.fogNear.value=d.near,m.fogFar.value=d.far):d.isFogExp2&&(m.fogDensity.value=d.density)}function s(m,d,E,y,C){d.isMeshBasicMaterial||d.isMeshLambertMaterial?r(m,d):d.isMeshToonMaterial?(r(m,d),u(m,d)):d.isMeshPhongMaterial?(r(m,d),h(m,d)):d.isMeshStandardMaterial?(r(m,d),f(m,d),d.isMeshPhysicalMaterial&&p(m,d,C)):d.isMeshMatcapMaterial?(r(m,d),x(m,d)):d.isMeshDepthMaterial?r(m,d):d.isMeshDistanceMaterial?(r(m,d),M(m,d)):d.isMeshNormalMaterial?r(m,d):d.isLineBasicMaterial?(o(m,d),d.isLineDashedMaterial&&a(m,d)):d.isPointsMaterial?c(m,d,E,y):d.isSpriteMaterial?l(m,d):d.isShadowMaterial?(m.color.value.copy(d.color),m.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function r(m,d){m.opacity.value=d.opacity,d.color&&m.diffuse.value.copy(d.color),d.emissive&&m.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.bumpMap&&(m.bumpMap.value=d.bumpMap,t(d.bumpMap,m.bumpMapTransform),m.bumpScale.value=d.bumpScale,d.side===hn&&(m.bumpScale.value*=-1)),d.normalMap&&(m.normalMap.value=d.normalMap,t(d.normalMap,m.normalMapTransform),m.normalScale.value.copy(d.normalScale),d.side===hn&&m.normalScale.value.negate()),d.displacementMap&&(m.displacementMap.value=d.displacementMap,t(d.displacementMap,m.displacementMapTransform),m.displacementScale.value=d.displacementScale,m.displacementBias.value=d.displacementBias),d.emissiveMap&&(m.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,m.emissiveMapTransform)),d.specularMap&&(m.specularMap.value=d.specularMap,t(d.specularMap,m.specularMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest);let E=e.get(d).envMap;if(E&&(m.envMap.value=E,m.flipEnvMap.value=E.isCubeTexture&&E.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=d.reflectivity,m.ior.value=d.ior,m.refractionRatio.value=d.refractionRatio),d.lightMap){m.lightMap.value=d.lightMap;let y=i._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=d.lightMapIntensity*y,t(d.lightMap,m.lightMapTransform)}d.aoMap&&(m.aoMap.value=d.aoMap,m.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,m.aoMapTransform))}function o(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform))}function a(m,d){m.dashSize.value=d.dashSize,m.totalSize.value=d.dashSize+d.gapSize,m.scale.value=d.scale}function c(m,d,E,y){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.size.value=d.size*E,m.scale.value=y*.5,d.map&&(m.map.value=d.map,t(d.map,m.uvTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function l(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.rotation.value=d.rotation,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function h(m,d){m.specular.value.copy(d.specular),m.shininess.value=Math.max(d.shininess,1e-4)}function u(m,d){d.gradientMap&&(m.gradientMap.value=d.gradientMap)}function f(m,d){m.metalness.value=d.metalness,d.metalnessMap&&(m.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,m.metalnessMapTransform)),m.roughness.value=d.roughness,d.roughnessMap&&(m.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,m.roughnessMapTransform)),e.get(d).envMap&&(m.envMapIntensity.value=d.envMapIntensity)}function p(m,d,E){m.ior.value=d.ior,d.sheen>0&&(m.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),m.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(m.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,m.sheenColorMapTransform)),d.sheenRoughnessMap&&(m.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,m.sheenRoughnessMapTransform))),d.clearcoat>0&&(m.clearcoat.value=d.clearcoat,m.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(m.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,m.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(m.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===hn&&m.clearcoatNormalScale.value.negate())),d.iridescence>0&&(m.iridescence.value=d.iridescence,m.iridescenceIOR.value=d.iridescenceIOR,m.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(m.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,m.iridescenceMapTransform)),d.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),d.transmission>0&&(m.transmission.value=d.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),d.transmissionMap&&(m.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,m.transmissionMapTransform)),m.thickness.value=d.thickness,d.thicknessMap&&(m.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=d.attenuationDistance,m.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(m.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(m.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=d.specularIntensity,m.specularColor.value.copy(d.specularColor),d.specularColorMap&&(m.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,m.specularColorMapTransform)),d.specularIntensityMap&&(m.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,m.specularIntensityMapTransform))}function x(m,d){d.matcap&&(m.matcap.value=d.matcap)}function M(m,d){let E=e.get(d).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Og(i,e,t,n){let s={},r={},o=[],a=t.isWebGL2?i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS):0;function c(E,y){let C=y.program;n.uniformBlockBinding(E,C)}function l(E,y){let C=s[E.id];C===void 0&&(x(E),C=h(E),s[E.id]=C,E.addEventListener("dispose",m));let U=y.program;n.updateUBOMapping(E,U);let T=e.render.frame;r[E.id]!==T&&(f(E),r[E.id]=T)}function h(E){let y=u();E.__bindingPointIndex=y;let C=i.createBuffer(),U=E.__size,T=E.usage;return i.bindBuffer(i.UNIFORM_BUFFER,C),i.bufferData(i.UNIFORM_BUFFER,U,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,C),C}function u(){for(let E=0;E<a;E++)if(o.indexOf(E)===-1)return o.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(E){let y=s[E.id],C=E.uniforms,U=E.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let T=0,P=C.length;T<P;T++){let z=Array.isArray(C[T])?C[T]:[C[T]];for(let b=0,R=z.length;b<R;b++){let G=z[b];if(p(G,T,b,U)===!0){let $=G.__offset,ue=Array.isArray(G.value)?G.value:[G.value],N=0;for(let H=0;H<ue.length;H++){let K=ue[H],ee=M(K);typeof K=="number"||typeof K=="boolean"?(G.__data[0]=K,i.bufferSubData(i.UNIFORM_BUFFER,$+N,G.__data)):K.isMatrix3?(G.__data[0]=K.elements[0],G.__data[1]=K.elements[1],G.__data[2]=K.elements[2],G.__data[3]=0,G.__data[4]=K.elements[3],G.__data[5]=K.elements[4],G.__data[6]=K.elements[5],G.__data[7]=0,G.__data[8]=K.elements[6],G.__data[9]=K.elements[7],G.__data[10]=K.elements[8],G.__data[11]=0):(K.toArray(G.__data,N),N+=ee.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,$,G.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(E,y,C,U){let T=E.value,P=y+"_"+C;if(U[P]===void 0)return typeof T=="number"||typeof T=="boolean"?U[P]=T:U[P]=T.clone(),!0;{let z=U[P];if(typeof T=="number"||typeof T=="boolean"){if(z!==T)return U[P]=T,!0}else if(z.equals(T)===!1)return z.copy(T),!0}return!1}function x(E){let y=E.uniforms,C=0,U=16;for(let P=0,z=y.length;P<z;P++){let b=Array.isArray(y[P])?y[P]:[y[P]];for(let R=0,G=b.length;R<G;R++){let $=b[R],ue=Array.isArray($.value)?$.value:[$.value];for(let N=0,H=ue.length;N<H;N++){let K=ue[N],ee=M(K),Q=C%U;Q!==0&&U-Q<ee.boundary&&(C+=U-Q),$.__data=new Float32Array(ee.storage/Float32Array.BYTES_PER_ELEMENT),$.__offset=C,C+=ee.storage}}}let T=C%U;return T>0&&(C+=U-T),E.__size=C,E.__cache={},this}function M(E){let y={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(y.boundary=4,y.storage=4):E.isVector2?(y.boundary=8,y.storage=8):E.isVector3||E.isColor?(y.boundary=16,y.storage=12):E.isVector4?(y.boundary=16,y.storage=16):E.isMatrix3?(y.boundary=48,y.storage=48):E.isMatrix4?(y.boundary=64,y.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),y}function m(E){let y=E.target;y.removeEventListener("dispose",m);let C=o.indexOf(y.__bindingPointIndex);o.splice(C,1),i.deleteBuffer(s[y.id]),delete s[y.id],delete r[y.id]}function d(){for(let E in s)i.deleteBuffer(s[E]);o=[],s={},r={}}return{bind:c,update:l,dispose:d}}var Vs=class{constructor(e={}){let{canvas:t=Wu(),context:n=null,depth:s=!0,stencil:r=!0,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let f;n!==null?f=n.getContextAttributes().alpha:f=o;let p=new Uint32Array(4),x=new Int32Array(4),M=null,m=null,d=[],E=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=$t,this._useLegacyLights=!1,this.toneMapping=ri,this.toneMappingExposure=1;let y=this,C=!1,U=0,T=0,P=null,z=-1,b=null,R=new Zt,G=new Zt,$=null,ue=new qe(0),N=0,H=t.width,K=t.height,ee=1,Q=null,j=null,le=new Zt(0,0,H,K),he=new Zt(0,0,H,K),ve=!1,J=new zs,se=!1,ye=!1,Ie=null,De=new Gt,et=new we,Ke=new D,Ge={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function ft(){return P===null?ee:1}let k=n;function Ft(w,F){for(let X=0;X<w.length;X++){let Z=w[X],q=t.getContext(Z,F);if(q!==null)return q}return null}try{let w={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${qo}`),t.addEventListener("webglcontextlost",fe,!1),t.addEventListener("webglcontextrestored",O,!1),t.addEventListener("webglcontextcreationerror",pe,!1),k===null){let F=["webgl2","webgl","experimental-webgl"];if(y.isWebGL1Renderer===!0&&F.shift(),k=Ft(F,w),k===null)throw Ft(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&k instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),k.getShaderPrecisionFormat===void 0&&(k.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(w){throw console.error("THREE.WebGLRenderer: "+w.message),w}let He,Ze,Ue,Tt,rt,A,S,W,re,te,ae,Ee,_e,oe,We,nt,ce,yt,lt,ze,ke,Te,at,gt;function At(){He=new tm(k),Ze=new Jp(k,He,e),He.init(Ze),Te=new Dg(k,He,Ze),Ue=new Lg(k,He,Ze),Tt=new sm(k),rt=new yg,A=new Ig(k,He,Ue,rt,Ze,Te,Tt),S=new Kp(y),W=new em(y),re=new ud(k,Ze),at=new Yp(k,He,re,Ze),te=new nm(k,re,Tt,at),ae=new cm(k,te,re,Tt),lt=new om(k,Ze,A),nt=new $p(rt),Ee=new xg(y,S,W,He,Ze,at,nt),_e=new Ng(y,rt),oe=new Mg,We=new Ag(He,Ze),yt=new qp(y,S,W,Ue,ae,f,c),ce=new Pg(y,ae,Ze),gt=new Og(k,Tt,Ze,Ue),ze=new Zp(k,He,Tt,Ze),ke=new im(k,He,Tt,Ze),Tt.programs=Ee.programs,y.capabilities=Ze,y.extensions=He,y.properties=rt,y.renderLists=oe,y.shadowMap=ce,y.state=Ue,y.info=Tt}At();let dt=new bo(y,k);this.xr=dt,this.getContext=function(){return k},this.getContextAttributes=function(){return k.getContextAttributes()},this.forceContextLoss=function(){let w=He.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){let w=He.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return ee},this.setPixelRatio=function(w){w!==void 0&&(ee=w,this.setSize(H,K,!1))},this.getSize=function(w){return w.set(H,K)},this.setSize=function(w,F,X=!0){if(dt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}H=w,K=F,t.width=Math.floor(w*ee),t.height=Math.floor(F*ee),X===!0&&(t.style.width=w+"px",t.style.height=F+"px"),this.setViewport(0,0,w,F)},this.getDrawingBufferSize=function(w){return w.set(H*ee,K*ee).floor()},this.setDrawingBufferSize=function(w,F,X){H=w,K=F,ee=X,t.width=Math.floor(w*X),t.height=Math.floor(F*X),this.setViewport(0,0,w,F)},this.getCurrentViewport=function(w){return w.copy(R)},this.getViewport=function(w){return w.copy(le)},this.setViewport=function(w,F,X,Z){w.isVector4?le.set(w.x,w.y,w.z,w.w):le.set(w,F,X,Z),Ue.viewport(R.copy(le).multiplyScalar(ee).floor())},this.getScissor=function(w){return w.copy(he)},this.setScissor=function(w,F,X,Z){w.isVector4?he.set(w.x,w.y,w.z,w.w):he.set(w,F,X,Z),Ue.scissor(G.copy(he).multiplyScalar(ee).floor())},this.getScissorTest=function(){return ve},this.setScissorTest=function(w){Ue.setScissorTest(ve=w)},this.setOpaqueSort=function(w){Q=w},this.setTransparentSort=function(w){j=w},this.getClearColor=function(w){return w.copy(yt.getClearColor())},this.setClearColor=function(){yt.setClearColor.apply(yt,arguments)},this.getClearAlpha=function(){return yt.getClearAlpha()},this.setClearAlpha=function(){yt.setClearAlpha.apply(yt,arguments)},this.clear=function(w=!0,F=!0,X=!0){let Z=0;if(w){let q=!1;if(P!==null){let Me=P.texture.format;q=Me===eh||Me===Ql||Me===jl}if(q){let Me=P.texture.type,Fe=Me===ai||Me===ni||Me===Zo||Me===Ai||Me===$l||Me===Kl,Ye=yt.getClearColor(),Qe=yt.getClearAlpha(),ot=Ye.r,tt=Ye.g,it=Ye.b;Fe?(p[0]=ot,p[1]=tt,p[2]=it,p[3]=Qe,k.clearBufferuiv(k.COLOR,0,p)):(x[0]=ot,x[1]=tt,x[2]=it,x[3]=Qe,k.clearBufferiv(k.COLOR,0,x))}else Z|=k.COLOR_BUFFER_BIT}F&&(Z|=k.DEPTH_BUFFER_BIT),X&&(Z|=k.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k.clear(Z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",fe,!1),t.removeEventListener("webglcontextrestored",O,!1),t.removeEventListener("webglcontextcreationerror",pe,!1),oe.dispose(),We.dispose(),rt.dispose(),S.dispose(),W.dispose(),ae.dispose(),at.dispose(),gt.dispose(),Ee.dispose(),dt.dispose(),dt.removeEventListener("sessionstart",Jt),dt.removeEventListener("sessionend",bt),Ie&&(Ie.dispose(),Ie=null),Lt.stop()};function fe(w){w.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),C=!0}function O(){console.log("THREE.WebGLRenderer: Context Restored."),C=!1;let w=Tt.autoReset,F=ce.enabled,X=ce.autoUpdate,Z=ce.needsUpdate,q=ce.type;At(),Tt.autoReset=w,ce.enabled=F,ce.autoUpdate=X,ce.needsUpdate=Z,ce.type=q}function pe(w){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function xe(w){let F=w.target;F.removeEventListener("dispose",xe),Je(F)}function Je(w){Ve(w),rt.remove(w)}function Ve(w){let F=rt.get(w).programs;F!==void 0&&(F.forEach(function(X){Ee.releaseProgram(X)}),w.isShaderMaterial&&Ee.releaseShaderCache(w))}this.renderBufferDirect=function(w,F,X,Z,q,Me){F===null&&(F=Ge);let Fe=q.isMesh&&q.matrixWorld.determinant()<0,Ye=ca(w,F,X,Z,q);Ue.setMaterial(Z,Fe);let Qe=X.index,ot=1;if(Z.wireframe===!0){if(Qe=te.getWireframeAttribute(X),Qe===void 0)return;ot=2}let tt=X.drawRange,it=X.attributes.position,Ut=tt.start*ot,tn=(tt.start+tt.count)*ot;Me!==null&&(Ut=Math.max(Ut,Me.start*ot),tn=Math.min(tn,(Me.start+Me.count)*ot)),Qe!==null?(Ut=Math.max(Ut,0),tn=Math.min(tn,Qe.count)):it!=null&&(Ut=Math.max(Ut,0),tn=Math.min(tn,it.count));let Ht=tn-Ut;if(Ht<0||Ht===1/0)return;at.setup(q,Z,Ye,X,Qe);let En,Rt=ze;if(Qe!==null&&(En=re.get(Qe),Rt=ke,Rt.setIndex(En)),q.isMesh)Z.wireframe===!0?(Ue.setLineWidth(Z.wireframeLinewidth*ft()),Rt.setMode(k.LINES)):Rt.setMode(k.TRIANGLES);else if(q.isLine){let ht=Z.linewidth;ht===void 0&&(ht=1),Ue.setLineWidth(ht*ft()),q.isLineSegments?Rt.setMode(k.LINES):q.isLineLoop?Rt.setMode(k.LINE_LOOP):Rt.setMode(k.LINE_STRIP)}else q.isPoints?Rt.setMode(k.POINTS):q.isSprite&&Rt.setMode(k.TRIANGLES);if(q.isBatchedMesh)Rt.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else if(q.isInstancedMesh)Rt.renderInstances(Ut,Ht,q.count);else if(X.isInstancedBufferGeometry){let ht=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,gs=Math.min(X.instanceCount,ht);Rt.renderInstances(Ut,Ht,gs)}else Rt.render(Ut,Ht)};function vt(w,F,X){w.transparent===!0&&w.side===pn&&w.forceSinglePass===!1?(w.side=hn,w.needsUpdate=!0,pi(w,F,X),w.side=oi,w.needsUpdate=!0,pi(w,F,X),w.side=pn):pi(w,F,X)}this.compile=function(w,F,X=null){X===null&&(X=w),m=We.get(X),m.init(),E.push(m),X.traverseVisible(function(q){q.isLight&&q.layers.test(F.layers)&&(m.pushLight(q),q.castShadow&&m.pushShadow(q))}),w!==X&&w.traverseVisible(function(q){q.isLight&&q.layers.test(F.layers)&&(m.pushLight(q),q.castShadow&&m.pushShadow(q))}),m.setupLights(y._useLegacyLights);let Z=new Set;return w.traverse(function(q){let Me=q.material;if(Me)if(Array.isArray(Me))for(let Fe=0;Fe<Me.length;Fe++){let Ye=Me[Fe];vt(Ye,X,q),Z.add(Ye)}else vt(Me,X,q),Z.add(Me)}),E.pop(),m=null,Z},this.compileAsync=function(w,F,X=null){let Z=this.compile(w,F,X);return new Promise(q=>{function Me(){if(Z.forEach(function(Fe){rt.get(Fe).currentProgram.isReady()&&Z.delete(Fe)}),Z.size===0){q(w);return}setTimeout(Me,10)}He.get("KHR_parallel_shader_compile")!==null?Me():setTimeout(Me,10)})};let _t=null;function Bt(w){_t&&_t(w)}function Jt(){Lt.stop()}function bt(){Lt.start()}let Lt=new ch;Lt.setAnimationLoop(Bt),typeof self<"u"&&Lt.setContext(self),this.setAnimationLoop=function(w){_t=w,dt.setAnimationLoop(w),w===null?Lt.stop():Lt.start()},dt.addEventListener("sessionstart",Jt),dt.addEventListener("sessionend",bt),this.render=function(w,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),dt.enabled===!0&&dt.isPresenting===!0&&(dt.cameraAutoUpdate===!0&&dt.updateCamera(F),F=dt.getCamera()),w.isScene===!0&&w.onBeforeRender(y,w,F,P),m=We.get(w,E.length),m.init(),E.push(m),De.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),J.setFromProjectionMatrix(De),ye=this.localClippingEnabled,se=nt.init(this.clippingPlanes,ye),M=oe.get(w,d.length),M.init(),d.push(M),un(w,F,0,y.sortObjects),M.finish(),y.sortObjects===!0&&M.sort(Q,j),this.info.render.frame++,se===!0&&nt.beginShadows();let X=m.state.shadowsArray;if(ce.render(X,w,F),se===!0&&nt.endShadows(),this.info.autoReset===!0&&this.info.reset(),yt.render(M,w),m.setupLights(y._useLegacyLights),F.isArrayCamera){let Z=F.cameras;for(let q=0,Me=Z.length;q<Me;q++){let Fe=Z[q];Jn(M,w,Fe,Fe.viewport)}}else Jn(M,w,F);P!==null&&(A.updateMultisampleRenderTarget(P),A.updateRenderTargetMipmap(P)),w.isScene===!0&&w.onAfterRender(y,w,F),at.resetDefaultState(),z=-1,b=null,E.pop(),E.length>0?m=E[E.length-1]:m=null,d.pop(),d.length>0?M=d[d.length-1]:M=null};function un(w,F,X,Z){if(w.visible===!1)return;if(w.layers.test(F.layers)){if(w.isGroup)X=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(F);else if(w.isLight)m.pushLight(w),w.castShadow&&m.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||J.intersectsSprite(w)){Z&&Ke.setFromMatrixPosition(w.matrixWorld).applyMatrix4(De);let Fe=ae.update(w),Ye=w.material;Ye.visible&&M.push(w,Fe,Ye,X,Ke.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||J.intersectsObject(w))){let Fe=ae.update(w),Ye=w.material;if(Z&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),Ke.copy(w.boundingSphere.center)):(Fe.boundingSphere===null&&Fe.computeBoundingSphere(),Ke.copy(Fe.boundingSphere.center)),Ke.applyMatrix4(w.matrixWorld).applyMatrix4(De)),Array.isArray(Ye)){let Qe=Fe.groups;for(let ot=0,tt=Qe.length;ot<tt;ot++){let it=Qe[ot],Ut=Ye[it.materialIndex];Ut&&Ut.visible&&M.push(w,Fe,Ut,X,Ke.z,it)}}else Ye.visible&&M.push(w,Fe,Ye,X,Ke.z,null)}}let Me=w.children;for(let Fe=0,Ye=Me.length;Fe<Ye;Fe++)un(Me[Fe],F,X,Z)}function Jn(w,F,X,Z){let q=w.opaque,Me=w.transmissive,Fe=w.transparent;m.setupLightsView(X),se===!0&&nt.setGlobalState(y.clippingPlanes,X),Me.length>0&&oa(q,Me,F,X),Z&&Ue.viewport(R.copy(Z)),q.length>0&&fi(q,F,X),Me.length>0&&fi(Me,F,X),Fe.length>0&&fi(Fe,F,X),Ue.buffers.depth.setTest(!0),Ue.buffers.depth.setMask(!0),Ue.buffers.color.setMask(!0),Ue.setPolygonOffset(!1)}function oa(w,F,X,Z){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;let Me=Ze.isWebGL2;Ie===null&&(Ie=new qn(1,1,{generateMipmaps:!0,type:He.has("EXT_color_buffer_half_float")?Fs:ai,minFilter:Os,samples:Me?4:0})),y.getDrawingBufferSize(et),Me?Ie.setSize(et.x,et.y):Ie.setSize(lo(et.x),lo(et.y));let Fe=y.getRenderTarget();y.setRenderTarget(Ie),y.getClearColor(ue),N=y.getClearAlpha(),N<1&&y.setClearColor(16777215,.5),y.clear();let Ye=y.toneMapping;y.toneMapping=ri,fi(w,X,Z),A.updateMultisampleRenderTarget(Ie),A.updateRenderTargetMipmap(Ie);let Qe=!1;for(let ot=0,tt=F.length;ot<tt;ot++){let it=F[ot],Ut=it.object,tn=it.geometry,Ht=it.material,En=it.group;if(Ht.side===pn&&Ut.layers.test(Z.layers)){let Rt=Ht.side;Ht.side=hn,Ht.needsUpdate=!0,ps(Ut,X,Z,tn,Ht,En),Ht.side=Rt,Ht.needsUpdate=!0,Qe=!0}}Qe===!0&&(A.updateMultisampleRenderTarget(Ie),A.updateRenderTargetMipmap(Ie)),y.setRenderTarget(Fe),y.setClearColor(ue,N),y.toneMapping=Ye}function fi(w,F,X){let Z=F.isScene===!0?F.overrideMaterial:null;for(let q=0,Me=w.length;q<Me;q++){let Fe=w[q],Ye=Fe.object,Qe=Fe.geometry,ot=Z===null?Fe.material:Z,tt=Fe.group;Ye.layers.test(X.layers)&&ps(Ye,F,X,Qe,ot,tt)}}function ps(w,F,X,Z,q,Me){w.onBeforeRender(y,F,X,Z,q,Me),w.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),q.onBeforeRender(y,F,X,Z,w,Me),q.transparent===!0&&q.side===pn&&q.forceSinglePass===!1?(q.side=hn,q.needsUpdate=!0,y.renderBufferDirect(X,F,Z,q,w,Me),q.side=oi,q.needsUpdate=!0,y.renderBufferDirect(X,F,Z,q,w,Me),q.side=pn):y.renderBufferDirect(X,F,Z,q,w,Me),w.onAfterRender(y,F,X,Z,q,Me)}function pi(w,F,X){F.isScene!==!0&&(F=Ge);let Z=rt.get(w),q=m.state.lights,Me=m.state.shadowsArray,Fe=q.state.version,Ye=Ee.getParameters(w,q.state,Me,F,X),Qe=Ee.getProgramCacheKey(Ye),ot=Z.programs;Z.environment=w.isMeshStandardMaterial?F.environment:null,Z.fog=F.fog,Z.envMap=(w.isMeshStandardMaterial?W:S).get(w.envMap||Z.environment),ot===void 0&&(w.addEventListener("dispose",xe),ot=new Map,Z.programs=ot);let tt=ot.get(Qe);if(tt!==void 0){if(Z.currentProgram===tt&&Z.lightsStateVersion===Fe)return Ys(w,Ye),tt}else Ye.uniforms=Ee.getUniforms(w),w.onBuild(X,Ye,y),w.onBeforeCompile(Ye,y),tt=Ee.acquireProgram(Ye,Qe),ot.set(Qe,tt),Z.uniforms=Ye.uniforms;let it=Z.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(it.clippingPlanes=nt.uniform),Ys(w,Ye),Z.needsLights=Ui(w),Z.lightsStateVersion=Fe,Z.needsLights&&(it.ambientLightColor.value=q.state.ambient,it.lightProbe.value=q.state.probe,it.directionalLights.value=q.state.directional,it.directionalLightShadows.value=q.state.directionalShadow,it.spotLights.value=q.state.spot,it.spotLightShadows.value=q.state.spotShadow,it.rectAreaLights.value=q.state.rectArea,it.ltc_1.value=q.state.rectAreaLTC1,it.ltc_2.value=q.state.rectAreaLTC2,it.pointLights.value=q.state.point,it.pointLightShadows.value=q.state.pointShadow,it.hemisphereLights.value=q.state.hemi,it.directionalShadowMap.value=q.state.directionalShadowMap,it.directionalShadowMatrix.value=q.state.directionalShadowMatrix,it.spotShadowMap.value=q.state.spotShadowMap,it.spotLightMatrix.value=q.state.spotLightMatrix,it.spotLightMap.value=q.state.spotLightMap,it.pointShadowMap.value=q.state.pointShadowMap,it.pointShadowMatrix.value=q.state.pointShadowMatrix),Z.currentProgram=tt,Z.uniformsList=null,tt}function ms(w){if(w.uniformsList===null){let F=w.currentProgram.getUniforms();w.uniformsList=as.seqWithValue(F.seq,w.uniforms)}return w.uniformsList}function Ys(w,F){let X=rt.get(w);X.outputColorSpace=F.outputColorSpace,X.batching=F.batching,X.instancing=F.instancing,X.instancingColor=F.instancingColor,X.skinning=F.skinning,X.morphTargets=F.morphTargets,X.morphNormals=F.morphNormals,X.morphColors=F.morphColors,X.morphTargetsCount=F.morphTargetsCount,X.numClippingPlanes=F.numClippingPlanes,X.numIntersection=F.numClipIntersection,X.vertexAlphas=F.vertexAlphas,X.vertexTangents=F.vertexTangents,X.toneMapping=F.toneMapping}function ca(w,F,X,Z,q){F.isScene!==!0&&(F=Ge),A.resetTextureUnits();let Me=F.fog,Fe=Z.isMeshStandardMaterial?F.environment:null,Ye=P===null?y.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Xn,Qe=(Z.isMeshStandardMaterial?W:S).get(Z.envMap||Fe),ot=Z.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,tt=!!X.attributes.tangent&&(!!Z.normalMap||Z.anisotropy>0),it=!!X.morphAttributes.position,Ut=!!X.morphAttributes.normal,tn=!!X.morphAttributes.color,Ht=ri;Z.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(Ht=y.toneMapping);let En=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Rt=En!==void 0?En.length:0,ht=rt.get(Z),gs=m.state.lights;if(se===!0&&(ye===!0||w!==b)){let cn=w===b&&Z.id===z;nt.setState(Z,w,cn)}let It=!1;Z.version===ht.__version?(ht.needsLights&&ht.lightsStateVersion!==gs.state.version||ht.outputColorSpace!==Ye||q.isBatchedMesh&&ht.batching===!1||!q.isBatchedMesh&&ht.batching===!0||q.isInstancedMesh&&ht.instancing===!1||!q.isInstancedMesh&&ht.instancing===!0||q.isSkinnedMesh&&ht.skinning===!1||!q.isSkinnedMesh&&ht.skinning===!0||q.isInstancedMesh&&ht.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&ht.instancingColor===!1&&q.instanceColor!==null||ht.envMap!==Qe||Z.fog===!0&&ht.fog!==Me||ht.numClippingPlanes!==void 0&&(ht.numClippingPlanes!==nt.numPlanes||ht.numIntersection!==nt.numIntersection)||ht.vertexAlphas!==ot||ht.vertexTangents!==tt||ht.morphTargets!==it||ht.morphNormals!==Ut||ht.morphColors!==tn||ht.toneMapping!==Ht||Ze.isWebGL2===!0&&ht.morphTargetsCount!==Rt)&&(It=!0):(It=!0,ht.__version=Z.version);let Un=ht.currentProgram;It===!0&&(Un=pi(Z,F,q));let Zs=!1,mi=!1,_s=!1,Xt=Un.getUniforms(),Nn=ht.uniforms;if(Ue.useProgram(Un.program)&&(Zs=!0,mi=!0,_s=!0),Z.id!==z&&(z=Z.id,mi=!0),Zs||b!==w){Xt.setValue(k,"projectionMatrix",w.projectionMatrix),Xt.setValue(k,"viewMatrix",w.matrixWorldInverse);let cn=Xt.map.cameraPosition;cn!==void 0&&cn.setValue(k,Ke.setFromMatrixPosition(w.matrixWorld)),Ze.logarithmicDepthBuffer&&Xt.setValue(k,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(Z.isMeshPhongMaterial||Z.isMeshToonMaterial||Z.isMeshLambertMaterial||Z.isMeshBasicMaterial||Z.isMeshStandardMaterial||Z.isShaderMaterial)&&Xt.setValue(k,"isOrthographic",w.isOrthographicCamera===!0),b!==w&&(b=w,mi=!0,_s=!0)}if(q.isSkinnedMesh){Xt.setOptional(k,q,"bindMatrix"),Xt.setOptional(k,q,"bindMatrixInverse");let cn=q.skeleton;cn&&(Ze.floatVertexTextures?(cn.boneTexture===null&&cn.computeBoneTexture(),Xt.setValue(k,"boneTexture",cn.boneTexture,A)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}q.isBatchedMesh&&(Xt.setOptional(k,q,"batchingTexture"),Xt.setValue(k,"batchingTexture",q._matricesTexture,A));let xs=X.morphAttributes;if((xs.position!==void 0||xs.normal!==void 0||xs.color!==void 0&&Ze.isWebGL2===!0)&&lt.update(q,X,Un),(mi||ht.receiveShadow!==q.receiveShadow)&&(ht.receiveShadow=q.receiveShadow,Xt.setValue(k,"receiveShadow",q.receiveShadow)),Z.isMeshGouraudMaterial&&Z.envMap!==null&&(Nn.envMap.value=Qe,Nn.flipEnvMap.value=Qe.isCubeTexture&&Qe.isRenderTargetTexture===!1?-1:1),mi&&(Xt.setValue(k,"toneMappingExposure",y.toneMappingExposure),ht.needsLights&&la(Nn,_s),Me&&Z.fog===!0&&_e.refreshFogUniforms(Nn,Me),_e.refreshMaterialUniforms(Nn,Z,ee,K,Ie),as.upload(k,ms(ht),Nn,A)),Z.isShaderMaterial&&Z.uniformsNeedUpdate===!0&&(as.upload(k,ms(ht),Nn,A),Z.uniformsNeedUpdate=!1),Z.isSpriteMaterial&&Xt.setValue(k,"center",q.center),Xt.setValue(k,"modelViewMatrix",q.modelViewMatrix),Xt.setValue(k,"normalMatrix",q.normalMatrix),Xt.setValue(k,"modelMatrix",q.matrixWorld),Z.isShaderMaterial||Z.isRawShaderMaterial){let cn=Z.uniformsGroups;for(let ys=0,ha=cn.length;ys<ha;ys++)if(Ze.isWebGL2){let Js=cn[ys];gt.update(Js,Un),gt.bind(Js,Un)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Un}function la(w,F){w.ambientLightColor.needsUpdate=F,w.lightProbe.needsUpdate=F,w.directionalLights.needsUpdate=F,w.directionalLightShadows.needsUpdate=F,w.pointLights.needsUpdate=F,w.pointLightShadows.needsUpdate=F,w.spotLights.needsUpdate=F,w.spotLightShadows.needsUpdate=F,w.rectAreaLights.needsUpdate=F,w.hemisphereLights.needsUpdate=F}function Ui(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(w,F,X){rt.get(w.texture).__webglTexture=F,rt.get(w.depthTexture).__webglTexture=X;let Z=rt.get(w);Z.__hasExternalTextures=!0,Z.__hasExternalTextures&&(Z.__autoAllocateDepthBuffer=X===void 0,Z.__autoAllocateDepthBuffer||He.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),Z.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(w,F){let X=rt.get(w);X.__webglFramebuffer=F,X.__useDefaultFramebuffer=F===void 0},this.setRenderTarget=function(w,F=0,X=0){P=w,U=F,T=X;let Z=!0,q=null,Me=!1,Fe=!1;if(w){let Qe=rt.get(w);Qe.__useDefaultFramebuffer!==void 0?(Ue.bindFramebuffer(k.FRAMEBUFFER,null),Z=!1):Qe.__webglFramebuffer===void 0?A.setupRenderTarget(w):Qe.__hasExternalTextures&&A.rebindTextures(w,rt.get(w.texture).__webglTexture,rt.get(w.depthTexture).__webglTexture);let ot=w.texture;(ot.isData3DTexture||ot.isDataArrayTexture||ot.isCompressedArrayTexture)&&(Fe=!0);let tt=rt.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(tt[F])?q=tt[F][X]:q=tt[F],Me=!0):Ze.isWebGL2&&w.samples>0&&A.useMultisampledRTT(w)===!1?q=rt.get(w).__webglMultisampledFramebuffer:Array.isArray(tt)?q=tt[X]:q=tt,R.copy(w.viewport),G.copy(w.scissor),$=w.scissorTest}else R.copy(le).multiplyScalar(ee).floor(),G.copy(he).multiplyScalar(ee).floor(),$=ve;if(Ue.bindFramebuffer(k.FRAMEBUFFER,q)&&Ze.drawBuffers&&Z&&Ue.drawBuffers(w,q),Ue.viewport(R),Ue.scissor(G),Ue.setScissorTest($),Me){let Qe=rt.get(w.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_CUBE_MAP_POSITIVE_X+F,Qe.__webglTexture,X)}else if(Fe){let Qe=rt.get(w.texture),ot=F||0;k.framebufferTextureLayer(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,Qe.__webglTexture,X||0,ot)}z=-1},this.readRenderTargetPixels=function(w,F,X,Z,q,Me,Fe){if(!(w&&w.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ye=rt.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&Fe!==void 0&&(Ye=Ye[Fe]),Ye){Ue.bindFramebuffer(k.FRAMEBUFFER,Ye);try{let Qe=w.texture,ot=Qe.format,tt=Qe.type;if(ot!==Rn&&Te.convert(ot)!==k.getParameter(k.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let it=tt===Fs&&(He.has("EXT_color_buffer_half_float")||Ze.isWebGL2&&He.has("EXT_color_buffer_float"));if(tt!==ai&&Te.convert(tt)!==k.getParameter(k.IMPLEMENTATION_COLOR_READ_TYPE)&&!(tt===ii&&(Ze.isWebGL2||He.has("OES_texture_float")||He.has("WEBGL_color_buffer_float")))&&!it){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=w.width-Z&&X>=0&&X<=w.height-q&&k.readPixels(F,X,Z,q,Te.convert(ot),Te.convert(tt),Me)}finally{let Qe=P!==null?rt.get(P).__webglFramebuffer:null;Ue.bindFramebuffer(k.FRAMEBUFFER,Qe)}}},this.copyFramebufferToTexture=function(w,F,X=0){let Z=Math.pow(2,-X),q=Math.floor(F.image.width*Z),Me=Math.floor(F.image.height*Z);A.setTexture2D(F,0),k.copyTexSubImage2D(k.TEXTURE_2D,X,0,0,w.x,w.y,q,Me),Ue.unbindTexture()},this.copyTextureToTexture=function(w,F,X,Z=0){let q=F.image.width,Me=F.image.height,Fe=Te.convert(X.format),Ye=Te.convert(X.type);A.setTexture2D(X,0),k.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,X.flipY),k.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,X.premultiplyAlpha),k.pixelStorei(k.UNPACK_ALIGNMENT,X.unpackAlignment),F.isDataTexture?k.texSubImage2D(k.TEXTURE_2D,Z,w.x,w.y,q,Me,Fe,Ye,F.image.data):F.isCompressedTexture?k.compressedTexSubImage2D(k.TEXTURE_2D,Z,w.x,w.y,F.mipmaps[0].width,F.mipmaps[0].height,Fe,F.mipmaps[0].data):k.texSubImage2D(k.TEXTURE_2D,Z,w.x,w.y,Fe,Ye,F.image),Z===0&&X.generateMipmaps&&k.generateMipmap(k.TEXTURE_2D),Ue.unbindTexture()},this.copyTextureToTexture3D=function(w,F,X,Z,q=0){if(y.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let Me=w.max.x-w.min.x+1,Fe=w.max.y-w.min.y+1,Ye=w.max.z-w.min.z+1,Qe=Te.convert(Z.format),ot=Te.convert(Z.type),tt;if(Z.isData3DTexture)A.setTexture3D(Z,0),tt=k.TEXTURE_3D;else if(Z.isDataArrayTexture||Z.isCompressedArrayTexture)A.setTexture2DArray(Z,0),tt=k.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}k.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,Z.flipY),k.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Z.premultiplyAlpha),k.pixelStorei(k.UNPACK_ALIGNMENT,Z.unpackAlignment);let it=k.getParameter(k.UNPACK_ROW_LENGTH),Ut=k.getParameter(k.UNPACK_IMAGE_HEIGHT),tn=k.getParameter(k.UNPACK_SKIP_PIXELS),Ht=k.getParameter(k.UNPACK_SKIP_ROWS),En=k.getParameter(k.UNPACK_SKIP_IMAGES),Rt=X.isCompressedTexture?X.mipmaps[q]:X.image;k.pixelStorei(k.UNPACK_ROW_LENGTH,Rt.width),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,Rt.height),k.pixelStorei(k.UNPACK_SKIP_PIXELS,w.min.x),k.pixelStorei(k.UNPACK_SKIP_ROWS,w.min.y),k.pixelStorei(k.UNPACK_SKIP_IMAGES,w.min.z),X.isDataTexture||X.isData3DTexture?k.texSubImage3D(tt,q,F.x,F.y,F.z,Me,Fe,Ye,Qe,ot,Rt.data):X.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),k.compressedTexSubImage3D(tt,q,F.x,F.y,F.z,Me,Fe,Ye,Qe,Rt.data)):k.texSubImage3D(tt,q,F.x,F.y,F.z,Me,Fe,Ye,Qe,ot,Rt),k.pixelStorei(k.UNPACK_ROW_LENGTH,it),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,Ut),k.pixelStorei(k.UNPACK_SKIP_PIXELS,tn),k.pixelStorei(k.UNPACK_SKIP_ROWS,Ht),k.pixelStorei(k.UNPACK_SKIP_IMAGES,En),q===0&&Z.generateMipmaps&&k.generateMipmap(tt),Ue.unbindTexture()},this.initTexture=function(w){w.isCubeTexture?A.setTextureCube(w,0):w.isData3DTexture?A.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?A.setTexture2DArray(w,0):A.setTexture2D(w,0),Ue.unbindTexture()},this.resetState=function(){U=0,T=0,P=null,Ue.reset(),at.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Wn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===Jo?"display-p3":"srgb",t.unpackColorSpace=wt.workingColorSpace===sa?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===$t?Ci:nh}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===Ci?$t:Xn}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}},wo=class extends Vs{};wo.prototype.isWebGL1Renderer=!0;var Xr=class i{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new qe(e),this.near=t,this.far=n}clone(){return new i(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},qr=class extends an{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}};var ui=class extends vn{constructor(e,t,n,s,r,o,a,c,l){super(e,t,n,s,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},Mn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let n=this.getLengths(),s=0,r=n.length,o;t?o=t:o=e*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(s=Math.floor(a+(c-a)/2),l=n[s]-o,l<0)a=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===o)return s/(r-1);let h=n[s],f=n[s+1]-h,p=(o-h)/f;return(s+p)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let o=this.getPoint(s),a=this.getPoint(r),c=t||(o.isVector2?new we:new D);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){let n=new D,s=[],r=[],o=[],a=new D,c=new Gt;for(let p=0;p<=e;p++){let x=p/e;s[p]=this.getTangentAt(x,new D)}r[0]=new D,o[0]=new D;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),f=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),f<=l&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let p=1;p<=e;p++){if(r[p]=r[p-1].clone(),o[p]=o[p-1].clone(),a.crossVectors(s[p-1],s[p]),a.length()>Number.EPSILON){a.normalize();let x=Math.acos(Kt(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(c.makeRotationAxis(a,x))}o[p].crossVectors(s[p],r[p])}if(t===!0){let p=Math.acos(Kt(r[0].dot(r[e]),-1,1));p/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(p=-p);for(let x=1;x<=e;x++)r[x].applyMatrix4(c.makeRotationAxis(s[x],p*x)),o[x].crossVectors(s[x],r[x])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Gs=class extends Mn{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,t){let n=t||new we,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);let a=this.aStartAngle+e*r,c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=c-this.aX,p=l-this.aY;c=f*h-p*u+this.aX,l=f*u+p*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},To=class extends Gs{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};function Ko(){let i=0,e=0,t=0,n=0;function s(r,o,a,c){i=r,e=a,t=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){s(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,u){let f=(o-r)/l-(a-r)/(l+h)+(a-o)/h,p=(a-o)/h-(c-o)/(h+u)+(c-a)/u;f*=h,p*=h,s(o,a,f,p)},calc:function(r){let o=r*r,a=o*r;return i+e*r+t*o+n*a}}}var Sr=new D,ja=new Ko,Qa=new Ko,eo=new Ko,Cn=class extends Mn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new D){let n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e,a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=s[(a-1)%r]:(Sr.subVectors(s[0],s[1]).add(s[0]),l=Sr);let u=s[a%r],f=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(Sr.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Sr),this.curveType==="centripetal"||this.curveType==="chordal"){let p=this.curveType==="chordal"?.5:.25,x=Math.pow(l.distanceToSquared(u),p),M=Math.pow(u.distanceToSquared(f),p),m=Math.pow(f.distanceToSquared(h),p);M<1e-4&&(M=1),x<1e-4&&(x=M),m<1e-4&&(m=M),ja.initNonuniformCatmullRom(l.x,u.x,f.x,h.x,x,M,m),Qa.initNonuniformCatmullRom(l.y,u.y,f.y,h.y,x,M,m),eo.initNonuniformCatmullRom(l.z,u.z,f.z,h.z,x,M,m)}else this.curveType==="catmullrom"&&(ja.initCatmullRom(l.x,u.x,f.x,h.x,this.tension),Qa.initCatmullRom(l.y,u.y,f.y,h.y,this.tension),eo.initCatmullRom(l.z,u.z,f.z,h.z,this.tension));return n.set(ja.calc(c),Qa.calc(c),eo.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new D().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Gl(i,e,t,n,s){let r=(n-e)*.5,o=(s-t)*.5,a=i*i,c=i*a;return(2*t-2*n+r+o)*c+(-3*t+3*n-2*r-o)*a+r*i+t}function Fg(i,e){let t=1-i;return t*t*e}function Bg(i,e){return 2*(1-i)*i*e}function Hg(i,e){return i*i*e}function Us(i,e,t,n){return Fg(i,e)+Bg(i,t)+Hg(i,n)}function zg(i,e){let t=1-i;return t*t*t*e}function Vg(i,e){let t=1-i;return 3*t*t*i*e}function Gg(i,e){return 3*(1-i)*i*i*e}function kg(i,e){return i*i*i*e}function Ns(i,e,t,n,s){return zg(i,e)+Vg(i,t)+Gg(i,n)+kg(i,s)}var Yr=class extends Mn{constructor(e=new we,t=new we,n=new we,s=new we){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new we){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ns(e,s.x,r.x,o.x,a.x),Ns(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ao=class extends Mn{constructor(e=new D,t=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new D){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ns(e,s.x,r.x,o.x,a.x),Ns(e,s.y,r.y,o.y,a.y),Ns(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Zr=class extends Mn{constructor(e=new we,t=new we){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new we){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new we){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ro=class extends Mn{constructor(e=new D,t=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new D){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new D){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Jr=class extends Mn{constructor(e=new we,t=new we,n=new we){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new we){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(Us(e,s.x,r.x,o.x),Us(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Co=class extends Mn{constructor(e=new D,t=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new D){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(Us(e,s.x,r.x,o.x),Us(e,s.y,r.y,o.y),Us(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},$r=class extends Mn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new we){let n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,c=s[o===0?o:o-1],l=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(Gl(a,c.x,l.x,h.x,u.x),Gl(a,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new we().fromArray(s))}return this}},kl=Object.freeze({__proto__:null,ArcCurve:To,CatmullRomCurve3:Cn,CubicBezierCurve:Yr,CubicBezierCurve3:Ao,EllipseCurve:Gs,LineCurve:Zr,LineCurve3:Ro,QuadraticBezierCurve:Jr,QuadraticBezierCurve3:Co,SplineCurve:$r}),Po=class extends Mn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new kl[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let o=s[r]-n,a=this.curves[r],c=a.getLength(),l=c===0?0:1-o/c;return a.getPointAt(l,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let o=r[s],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,c=o.getPoints(a);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new kl[s.type]().fromJSON(s))}return this}},Lo=class extends Po{constructor(e){super(),this.type="Path",this.currentPoint=new we,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Zr(this.currentPoint.clone(),new we(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new Jr(this.currentPoint.clone(),new we(e,t),new we(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,o){let a=new Yr(this.currentPoint.clone(),new we(e,t),new we(n,s),new we(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new $r(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,o){let a=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+a,t+c,n,s,r,o),this}absarc(e,t,n,s,r,o){return this.absellipse(e,t,n,n,s,r,o),this}ellipse(e,t,n,s,r,o,a,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,s,r,o,a,c),this}absellipse(e,t,n,s,r,o,a,c){let l=new Gs(e,t,n,s,r,o,a,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Io=class i extends on{constructor(e=[new we(0,-.5),new we(.5,0),new we(0,.5)],t=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:s},t=Math.floor(t),s=Kt(s,0,Math.PI*2);let r=[],o=[],a=[],c=[],l=[],h=1/t,u=new D,f=new we,p=new D,x=new D,M=new D,m=0,d=0;for(let E=0;E<=e.length-1;E++)switch(E){case 0:m=e[E+1].x-e[E].x,d=e[E+1].y-e[E].y,p.x=d*1,p.y=-m,p.z=d*0,M.copy(p),p.normalize(),c.push(p.x,p.y,p.z);break;case e.length-1:c.push(M.x,M.y,M.z);break;default:m=e[E+1].x-e[E].x,d=e[E+1].y-e[E].y,p.x=d*1,p.y=-m,p.z=d*0,x.copy(p),p.x+=M.x,p.y+=M.y,p.z+=M.z,p.normalize(),c.push(p.x,p.y,p.z),M.copy(x)}for(let E=0;E<=t;E++){let y=n+E*h*s,C=Math.sin(y),U=Math.cos(y);for(let T=0;T<=e.length-1;T++){u.x=e[T].x*C,u.y=e[T].y,u.z=e[T].x*U,o.push(u.x,u.y,u.z),f.x=E/t,f.y=T/(e.length-1),a.push(f.x,f.y);let P=c[3*T+0]*C,z=c[3*T+1],b=c[3*T+0]*U;l.push(P,z,b)}}for(let E=0;E<t;E++)for(let y=0;y<e.length-1;y++){let C=y+E*e.length,U=C,T=C+e.length,P=C+e.length+1,z=C+1;r.push(U,T,z),r.push(P,z,T)}this.setIndex(r),this.setAttribute("position",new Et(o,3)),this.setAttribute("uv",new Et(a,2)),this.setAttribute("normal",new Et(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.points,e.segments,e.phiStart,e.phiLength)}},di=class i extends Io{constructor(e=1,t=1,n=4,s=8){let r=new Lo;r.absarc(0,-t/2,e,Math.PI*1.5,0),r.absarc(0,t/2,e,0,Math.PI*.5),super(r.getPoints(n),s),this.type="CapsuleGeometry",this.parameters={radius:e,length:t,capSegments:n,radialSegments:s}}static fromJSON(e){return new i(e.radius,e.length,e.capSegments,e.radialSegments)}},Zn=class i extends on{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);let r=[],o=[],a=[],c=[],l=new D,h=new we;o.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let u=0,f=3;u<=t;u++,f+=3){let p=n+u/t*s;l.x=e*Math.cos(p),l.y=e*Math.sin(p),o.push(l.x,l.y,l.z),a.push(0,0,1),h.x=(o[f]/e+1)/2,h.y=(o[f+1]/e+1)/2,c.push(h.x,h.y)}for(let u=1;u<=t;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Et(o,3)),this.setAttribute("normal",new Et(a,3)),this.setAttribute("uv",new Et(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},St=class i extends on{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],f=[],p=[],x=0,M=[],m=n/2,d=0;E(),o===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new Et(u,3)),this.setAttribute("normal",new Et(f,3)),this.setAttribute("uv",new Et(p,2));function E(){let C=new D,U=new D,T=0,P=(t-e)/n;for(let z=0;z<=r;z++){let b=[],R=z/r,G=R*(t-e)+e;for(let $=0;$<=s;$++){let ue=$/s,N=ue*c+a,H=Math.sin(N),K=Math.cos(N);U.x=G*H,U.y=-R*n+m,U.z=G*K,u.push(U.x,U.y,U.z),C.set(H,P,K).normalize(),f.push(C.x,C.y,C.z),p.push(ue,1-R),b.push(x++)}M.push(b)}for(let z=0;z<s;z++)for(let b=0;b<r;b++){let R=M[b][z],G=M[b+1][z],$=M[b+1][z+1],ue=M[b][z+1];h.push(R,G,ue),h.push(G,$,ue),T+=6}l.addGroup(d,T,0),d+=T}function y(C){let U=x,T=new we,P=new D,z=0,b=C===!0?e:t,R=C===!0?1:-1;for(let $=1;$<=s;$++)u.push(0,m*R,0),f.push(0,R,0),p.push(.5,.5),x++;let G=x;for(let $=0;$<=s;$++){let N=$/s*c+a,H=Math.cos(N),K=Math.sin(N);P.x=b*K,P.y=m*R,P.z=b*H,u.push(P.x,P.y,P.z),f.push(0,R,0),T.x=H*.5+.5,T.y=K*.5*R+.5,p.push(T.x,T.y),x++}for(let $=0;$<s;$++){let ue=U+$,N=G+$;C===!0?h.push(N,N+1,ue):h.push(N+1,N,ue),z+=3}l.addGroup(d,z,C===!0?1:2),d+=z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},jt=class i extends St{constructor(e=1,t=1,n=32,s=1,r=!1,o=0,a=Math.PI*2){super(0,e,t,n,s,r,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(e){return new i(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},Kr=class i extends on{constructor(e=[],t=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:s};let r=[],o=[];a(s),l(n),h(),this.setAttribute("position",new Et(r,3)),this.setAttribute("normal",new Et(r.slice(),3)),this.setAttribute("uv",new Et(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(E){let y=new D,C=new D,U=new D;for(let T=0;T<t.length;T+=3)p(t[T+0],y),p(t[T+1],C),p(t[T+2],U),c(y,C,U,E)}function c(E,y,C,U){let T=U+1,P=[];for(let z=0;z<=T;z++){P[z]=[];let b=E.clone().lerp(C,z/T),R=y.clone().lerp(C,z/T),G=T-z;for(let $=0;$<=G;$++)$===0&&z===T?P[z][$]=b:P[z][$]=b.clone().lerp(R,$/G)}for(let z=0;z<T;z++)for(let b=0;b<2*(T-z)-1;b++){let R=Math.floor(b/2);b%2===0?(f(P[z][R+1]),f(P[z+1][R]),f(P[z][R])):(f(P[z][R+1]),f(P[z+1][R+1]),f(P[z+1][R]))}}function l(E){let y=new D;for(let C=0;C<r.length;C+=3)y.x=r[C+0],y.y=r[C+1],y.z=r[C+2],y.normalize().multiplyScalar(E),r[C+0]=y.x,r[C+1]=y.y,r[C+2]=y.z}function h(){let E=new D;for(let y=0;y<r.length;y+=3){E.x=r[y+0],E.y=r[y+1],E.z=r[y+2];let C=m(E)/2/Math.PI+.5,U=d(E)/Math.PI+.5;o.push(C,1-U)}x(),u()}function u(){for(let E=0;E<o.length;E+=6){let y=o[E+0],C=o[E+2],U=o[E+4],T=Math.max(y,C,U),P=Math.min(y,C,U);T>.9&&P<.1&&(y<.2&&(o[E+0]+=1),C<.2&&(o[E+2]+=1),U<.2&&(o[E+4]+=1))}}function f(E){r.push(E.x,E.y,E.z)}function p(E,y){let C=E*3;y.x=e[C+0],y.y=e[C+1],y.z=e[C+2]}function x(){let E=new D,y=new D,C=new D,U=new D,T=new we,P=new we,z=new we;for(let b=0,R=0;b<r.length;b+=9,R+=6){E.set(r[b+0],r[b+1],r[b+2]),y.set(r[b+3],r[b+4],r[b+5]),C.set(r[b+6],r[b+7],r[b+8]),T.set(o[R+0],o[R+1]),P.set(o[R+2],o[R+3]),z.set(o[R+4],o[R+5]),U.copy(E).add(y).add(C).divideScalar(3);let G=m(U);M(T,R+0,E,G),M(P,R+2,y,G),M(z,R+4,C,G)}}function M(E,y,C,U){U<0&&E.x===1&&(o[y]=E.x-1),C.x===0&&C.z===0&&(o[y]=U/2/Math.PI+.5)}function m(E){return Math.atan2(E.z,-E.x)}function d(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.vertices,e.indices,e.radius,e.details)}},jr=class i extends Kr{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,s=1/n,r=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-s,-n,0,-s,n,0,s,-n,0,s,n,-s,-n,0,-s,n,0,s,-n,0,s,n,0,-n,0,-s,n,0,-s,-n,0,s,n,0,s],o=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(r,o,e,t),this.type="DodecahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}};var Pn=class i extends Kr{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,s=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}};var xt=class i extends on{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let c=Math.min(o+a,Math.PI),l=0,h=[],u=new D,f=new D,p=[],x=[],M=[],m=[];for(let d=0;d<=n;d++){let E=[],y=d/n,C=0;d===0&&o===0?C=.5/t:d===n&&c===Math.PI&&(C=-.5/t);for(let U=0;U<=t;U++){let T=U/t;u.x=-e*Math.cos(s+T*r)*Math.sin(o+y*a),u.y=e*Math.cos(o+y*a),u.z=e*Math.sin(s+T*r)*Math.sin(o+y*a),x.push(u.x,u.y,u.z),f.copy(u).normalize(),M.push(f.x,f.y,f.z),m.push(T+C,1-y),E.push(l++)}h.push(E)}for(let d=0;d<n;d++)for(let E=0;E<t;E++){let y=h[d][E+1],C=h[d][E],U=h[d+1][E],T=h[d+1][E+1];(d!==0||o>0)&&p.push(y,C,T),(d!==n-1||c<Math.PI)&&p.push(C,U,T)}this.setIndex(p),this.setAttribute("position",new Et(x,3)),this.setAttribute("normal",new Et(M,3)),this.setAttribute("uv",new Et(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var ks=class i extends on{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);let o=[],a=[],c=[],l=[],h=new D,u=new D,f=new D;for(let p=0;p<=n;p++)for(let x=0;x<=s;x++){let M=x/s*r,m=p/n*Math.PI*2;u.x=(e+t*Math.cos(m))*Math.cos(M),u.y=(e+t*Math.cos(m))*Math.sin(M),u.z=t*Math.sin(m),a.push(u.x,u.y,u.z),h.x=e*Math.cos(M),h.y=e*Math.sin(M),f.subVectors(u,h).normalize(),c.push(f.x,f.y,f.z),l.push(x/s),l.push(p/n)}for(let p=1;p<=n;p++)for(let x=1;x<=s;x++){let M=(s+1)*p+x-1,m=(s+1)*(p-1)+x-1,d=(s+1)*(p-1)+x,E=(s+1)*p+x;o.push(M,m,E),o.push(m,d,E)}this.setIndex(o),this.setAttribute("position",new Et(a,3)),this.setAttribute("normal",new Et(c,3)),this.setAttribute("uv",new Et(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var je=class extends Li{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new qe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new qe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ih,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};function br(i,e,t){return!i||!t&&i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Wg(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}var ds=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Do=class extends ds{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:jc,endingEnd:jc}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],c=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Qc:r=e,a=2*t-n;break;case el:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Qc:o=e,c=2*n-t;break;case el:o=1,c=n+s[1]-s[0];break;default:o=e-1,c=t}let l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,p=this._weightNext,x=(n-t)/(s-t),M=x*x,m=M*x,d=-f*m+2*f*M-f*x,E=(1+f)*m+(-1.5-2*f)*M+(-.5+f)*x+1,y=(-1-p)*m+(1.5+p)*M+.5*x,C=p*m-p*M;for(let U=0;U!==a;++U)r[U]=d*o[h+U]+E*o[l+U]+y*o[c+U]+C*o[u+U];return r}},Uo=class extends ds{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=(n-t)/(s-t),u=1-h;for(let f=0;f!==a;++f)r[f]=o[l+f]*u+o[c+f]*h;return r}},No=class extends ds{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},Ln=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=br(t,this.TimeBufferType),this.values=br(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:br(e.times,Array),values:br(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new No(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Uo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Do(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case Tr:t=this.InterpolantFactoryMethodDiscrete;break;case Ar:t=this.InterpolantFactoryMethodLinear;break;case Aa:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Tr;case this.InterpolantFactoryMethodLinear:return Ar;case this.InterpolantFactoryMethodSmooth:return Aa}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let c=n[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(s!==void 0&&Wg(s))for(let a=0,c=s.length;a!==c;++a){let l=s[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Aa,r=e.length-1,o=1;for(let a=1;a<r;++a){let c=!1,l=e[a],h=e[a+1];if(l!==h&&(a!==1||l!==e[0]))if(s)c=!0;else{let u=a*n,f=u-n,p=u+n;for(let x=0;x!==n;++x){let M=t[u+x];if(M!==t[f+x]||M!==t[p+x]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];let u=a*n,f=o*n;for(let p=0;p!==n;++p)t[f+p]=t[u+p]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};Ln.prototype.TimeBufferType=Float32Array;Ln.prototype.ValueBufferType=Float32Array;Ln.prototype.DefaultInterpolation=Ar;var Ii=class extends Ln{};Ii.prototype.ValueTypeName="bool";Ii.prototype.ValueBufferType=Array;Ii.prototype.DefaultInterpolation=Tr;Ii.prototype.InterpolantFactoryMethodLinear=void 0;Ii.prototype.InterpolantFactoryMethodSmooth=void 0;var Oo=class extends Ln{};Oo.prototype.ValueTypeName="color";var Fo=class extends Ln{};Fo.prototype.ValueTypeName="number";var Bo=class extends ds{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-t)/(s-t),l=e*a;for(let h=l+a;l!==h;l+=4)li.slerpFlat(r,0,o,l-a,o,l,c);return r}},Ws=class extends Ln{InterpolantFactoryMethodLinear(e){return new Bo(this.times,this.values,this.getValueSize(),e)}};Ws.prototype.ValueTypeName="quaternion";Ws.prototype.DefaultInterpolation=Ar;Ws.prototype.InterpolantFactoryMethodSmooth=void 0;var Di=class extends Ln{};Di.prototype.ValueTypeName="string";Di.prototype.ValueBufferType=Array;Di.prototype.DefaultInterpolation=Tr;Di.prototype.InterpolantFactoryMethodLinear=void 0;Di.prototype.InterpolantFactoryMethodSmooth=void 0;var Ho=class extends Ln{};Ho.prototype.ValueTypeName="vector";var zo=class{constructor(e,t,n){let s=this,r=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=l.length;u<f;u+=2){let p=l[u],x=l[u+1];if(p.global&&(p.lastIndex=0),p.test(h))return x}return null}}},Xg=new zo,Vo=class{constructor(e){this.manager=e!==void 0?e:Xg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};Vo.DEFAULT_MATERIAL_NAME="__DEFAULT";var Qr=class extends an{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new qe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}},ea=class extends Qr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(an.DEFAULT_UP),this.updateMatrix(),this.groundColor=new qe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}},to=new Gt,Wl=new D,Xl=new D,Go=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.map=null,this.mapPass=null,this.matrix=new Gt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new zs,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new Zt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Wl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Wl),Xl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Xl),t.updateMatrixWorld(),to.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(to),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(to)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}};var ko=class extends Go{constructor(){super(new Gr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Xs=class extends Qr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(an.DEFAULT_UP),this.updateMatrix(),this.target=new an,this.shadow=new ko}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var jo="\\[\\]\\.:\\/",qg=new RegExp("["+jo+"]","g"),Qo="[^"+jo+"]",Yg="[^"+jo.replace("\\.","")+"]",Zg=/((?:WC+[\/:])*)/.source.replace("WC",Qo),Jg=/(WCOD+)?/.source.replace("WCOD",Yg),$g=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Qo),Kg=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Qo),jg=new RegExp("^"+Zg+Jg+$g+Kg+"$"),Qg=["material","materials","bones","map"],Wo=class{constructor(e,t,n){let s=n||Dt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Dt=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(qg,"")}static parseTrackName(e){let t=jg.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Qg.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let c=n(a.children);if(c)return c}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let o=e[s];if(o===void 0){let l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Dt.Composite=Wo;Dt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Dt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Dt.prototype.GetterByBindingType=[Dt.prototype._getValue_direct,Dt.prototype._getValue_array,Dt.prototype._getValue_arrayElement,Dt.prototype._getValue_toArray];Dt.prototype.SetterByBindingTypeAndVersioning=[[Dt.prototype._setValue_direct,Dt.prototype._setValue_direct_setNeedsUpdate,Dt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Dt.prototype._setValue_array,Dt.prototype._setValue_array_setNeedsUpdate,Dt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Dt.prototype._setValue_arrayElement,Dt.prototype._setValue_arrayElement_setNeedsUpdate,Dt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Dt.prototype._setValue_fromArray,Dt.prototype._setValue_fromArray_setNeedsUpdate,Dt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var n0=new Float32Array(1);var ta=class{constructor(e,t,n=0,s=1/0){this.ray=new Or(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new Hs,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}intersectObject(e,t=!0,n=[]){return Xo(e,this,n,t),n.sort(ql),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)Xo(e[s],this,n,t);return n.sort(ql),n}};function ql(i,e){return i.distance-e.distance}function Xo(i,e,t,n){if(i.layers.test(e.layers)&&i.raycast(e,t),n===!0){let s=i.children;for(let r=0,o=s.length;r<o;r++)Xo(s[r],e,t,!0)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:qo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=qo);function ph(i,e){let t=[],n=new ct;i.add(n);let s=new je({color:16777215,roughness:1,flatShading:!0,transparent:!0,opacity:.95}),r=10;for(let a=0;a<r;a++){let c=new ct,l=3+(Math.random()*3|0);for(let u=0;u<l;u++){let f=1.4+Math.random()*1.6,p=new V(new Pn(f,0),s);p.position.set((u-l/2)*1.9+(Math.random()-.5)*1.1,(Math.random()-.5)*.9,(Math.random()-.5)*1.6),p.scale.y=.6,c.add(p)}let h=.55+Math.random()*.6;c.scale.setScalar(h),c.position.set((Math.random()-.5)*e*1,16+Math.random()*12,-e*.3-Math.random()*e*.3),n.add(c),t.push({obj:c,vel:1+Math.random()*1.6})}function o(a){let c=e*.6;for(let l of t)l.obj.position.x+=l.vel*a,l.obj.position.x>c&&(l.obj.position.x=-c)}return{animar:o}}function e0(){let i=new ct,e=new je({color:"#ffffff",roughness:.85,flatShading:!0,emissive:new qe("#dfe9f5"),emissiveIntensity:.35}),t=new V(new di(.14,.7,4,8),e);t.rotation.z=Math.PI/2,i.add(t);let n=new V(new xt(.16,8,6),e);n.position.x=.5,i.add(n);let s=new V(new jt(.22,.4,3),e);s.rotation.z=-Math.PI/2,s.position.x=-.55,s.scale.set(1,1,.35),i.add(s);let r=new jt(.28,1.25,3),o=a=>{let c=new ct,l=new V(r,e);return l.rotation.x=a*Math.PI/2,l.scale.set(1.6,1,.12),l.position.z=a*.62,c.add(l),i.add(c),c};return{grupo:i,alaIzq:o(-1),alaDer:o(1)}}function mh(i,e,t){let n=null,s=0,r=[];if(e){n=new ct;let c=new je({color:"#ff8c42",roughness:.5,flatShading:!0}),l=new V(new xt(.45,10,8),c);l.scale.set(1.5,.8,.6),n.add(l);let h=new V(new jt(.32,.5,4),c);h.rotation.z=Math.PI/2,h.position.x=-.85,h.scale.set(1,1,.5),n.add(h);let u=new V(new xt(.08,6,6),new je({color:"#111"}));u.position.set(.45,.12,.28),n.add(u),n.position.copy(e),n.position.y=-1,n.visible=!1,i.add(n)}let o=t?3:5;for(let c=0;c<o;c++){let l=e0(),h=22+Math.random()*26,u=(Math.random()-.5)*40,f=(Math.random()-.5)*40,p=20+Math.random()*12,x=.15+Math.random()*.2,M=Math.random()*Math.PI*2;l.grupo.scale.setScalar(.9+Math.random()*.6),i.add(l.grupo),r.push({...l,radio:h,cx:u,cz:f,alt:p,vel:x,fase:M,aleteo:2.2+Math.random()*1.8})}function a(c,l){if(n&&e){s+=l;let h=4.5,u=1.05,f=s%h;if(f<u){let p=f/u;n.visible=!0;let x=Math.sin(p*Math.PI)*2.2;n.position.set(e.x,.2+x,e.z),n.rotation.z=(p-.5)*2.2,n.rotation.y=c/400}else n.visible=!1}for(let h of r){h.fase+=h.vel*l;let u=h.cx+Math.cos(h.fase)*h.radio,f=h.cz+Math.sin(h.fase)*h.radio;h.grupo.position.set(u,h.alt+Math.sin(h.fase*2)*1.5,f),h.grupo.rotation.y=-h.fase,h.grupo.rotation.z=Math.sin(h.fase)*.12;let p=Math.sin(c/1e3*h.aleteo*6);h.alaIzq.rotation.x=-p*.9,h.alaDer.rotation.x=p*.9}}return{animar:a}}var gh=["#ff4d4d","#ffd24d","#4dff88","#4db8ff","#e04dff","#ff8f4d","#ffffff"];function _h(i){let e=[],t=!1;function n(o,a,c){let l=new qe(gh[Math.random()*gh.length|0]),h=26+(Math.random()*14|0),u=new xt(.22,6,6),f=new ct;f.position.set(o,a,c),i.add(f);let p=[];for(let x=0;x<h;x++){let M=new mn({color:l.clone(),transparent:!0,opacity:1,depthWrite:!1}),m=new V(u,M),d=Math.random()*Math.PI*2,E=Math.acos(2*Math.random()-1),y=6+Math.random()*7,C=new D(Math.sin(E)*Math.cos(d),Math.cos(E),Math.sin(E)*Math.sin(d)).multiplyScalar(y);f.add(m),p.push({m,v:C})}e.push({grupo:f,parts:p,vida:0,dur:1.6})}function s(o){if(t)return;t=!0;let a=o?o.clone():new D(0,0,0),c=0,l=14,h=()=>{if(!t||c>=l)return;c++;let u=a.x+4+(Math.random()-.5)*18,f=12+Math.random()*8,p=a.z+(Math.random()-.5)*18;n(u,f,p),setTimeout(h,350+Math.random()*300)};h(),setTimeout(()=>{t=!1},7e3)}function r(o){if(!e.length)return;let a=9;for(let c=e.length-1;c>=0;c--){let l=e[c];l.vida+=o;let h=l.vida/l.dur;for(let u of l.parts)u.v.y-=a*o,u.m.position.addScaledVector(u.v,o),u.m.material.opacity=Math.max(0,1-h);l.vida>=l.dur&&(i.remove(l.grupo),l.parts.forEach(u=>u.m.material.dispose()),e.splice(c,1))}}return{iniciar:s,animar:r}}(function(){"use strict";let i={},e={paradas:[],puntos:[]},t=0,n=0,s=!1,r={},o=null,a=new Set,c=0,l=new Set,h=null,u=null,f=null,p={},x=!1,M=!1,m=null,d=null,E,y,C,U,T,P,z,b,R,G,$,ue,N,H,K,ee=[],Q=null,j=null,le=8,he=null,ve=null,J=null,se={},ye={},Ie=!1,De=null,et=null,Ke=null,Ge=null,ft=null,k=!1,Ft=!1,He=null,Ze=null,Ue=0,Tt=new qe("#0ea5e9"),rt="",A=null,S=!1,W=null,re=0,te=null,ae=!1,Ee=null,_e=!1,oe=window.jQuery;function We(g){return String(g??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function nt(){if(ae=!1,!!te){try{te.pause(),te.currentTime=0}catch{}te=null}}function ce(g,_){if(!g){_&&_();return}let v=String(i.$app?.data("url-tts")||"");if(!v||!oe){_&&_();return}nt(),ae=!0,oe.ajax({url:v,method:"GET",data:{texto:g},dataType:"json"}).done(function(I){let L=I?.data?.url;if(!L){ae=!1,_&&_();return}te=new Audio(L),te.onended=function(){ae=!1,te=null,_&&_()},te.onerror=function(){ae=!1,te=null,_&&_()},te.play().catch(function(){ae=!1,te=null,_&&_()})}).fail(function(){ae=!1,_&&_()})}function yt(g,_){return g.id==="inicio"||g.id==="fin"?g.etiqueta||g.titulo||"":_+". "+(g.titulo||g.etiqueta||"")}function lt(g,_){return g.id==="inicio"?"\u25B6":g.id==="fin"?"\u2605":String(_)}function ze(g){if(!g||!g.id)return!1;let _=String(g.id);return _==="experiencia"||_.indexOf("experiencia-")===0}function ke(){r={},s=!!e.ramificado,h=null,u=null,c=0,f=null,p={};let g=e.paradas||[];if(g.forEach((v,I)=>{r[v.id]={parada:v,indice:I,rama:typeof v.rama=="number"?v.rama:0,siguientes:Array.isArray(v.siguientes)?v.siguientes.slice():[],padres:[],pos:null,t:0}}),!g.some(v=>Array.isArray(v.siguientes)&&v.siguientes.length))for(let v=0;v<g.length-1;v++)r[g[v].id].siguientes=[g[v+1].id];if(Object.values(r).forEach(v=>{v.siguientes.forEach(I=>{r[I]&&r[I].padres.push(v.parada.id)})}),Object.values(r).forEach(v=>{v.parada.id==="fin"&&(u=v.parada.id),s&&v.rama===0&&v.siguientes.length>1&&h===null&&(h=v.parada.id)}),u===null){let v=Object.values(r).find(I=>I.siguientes.length===0);v&&(u=v.parada.id)}if(s)if(typeof e.ramas=="number"&&e.ramas>0)c=e.ramas;else{let v=new Set;Object.values(r).forEach(I=>{I.rama>0&&v.add(I.rama)}),c=v.size}else c=0}function Te(g){return Object.values(r).filter(_=>_.rama===g).sort((_,v)=>_.indice-v.indice)}function at(){return Object.values(r).filter(g=>g.rama===0).sort((g,_)=>g.indice-_.indice)}function gt(g){return!h||!r[h]?null:r[h].siguientes.find(v=>r[v]&&r[v].rama===g)||null}function At(g){return r[g]?r[g].rama:0}function dt(g){if(!s)return!1;let _=At(g);return _<=0?!1:gt(_)===g}function fe(){if(!s||!o)return!1;let g=r[o];return g?ze(g.parada)&&l.has(g.rama):!1}function O(){let g=[];for(let _=1;_<=c;_++)l.has(_)||g.push(_);return g}function pe(){if(!M||x)return[];if(!s){let _=r[o];return _?_.siguientes.filter(v=>!a.has(v)):[]}if(o===h){let _=O();if(_.length===0)return u?[u]:[];let v=gt(_[0]);return v?[v]:[]}if(fe())return O().length>0?h?[h]:[]:u?[u]:[];let g=r[o];return g?g.siguientes.filter(_=>!a.has(_)):[]}function xe(){if(!s)return;let g=0,_=pe();_.length&&r[_[0]]&&(g=r[_[0]].rama),!g&&o&&r[o]&&(g=r[o].rama);let v=O(),I=v.length?v[0]:0;for(let L=1;L<=c;L++){if(!se[L])continue;let B=L===g||L===I||l.has(L);se[L].visible=!B}}function Je(g){return pe().indexOf(g)>=0}function Ve(g){return ee.find(_=>_.parada.id===g)||null}function vt(g,_){let v=Math.sin(g*127.1+_*311.7)*43758.5453;return v-Math.floor(v)}function _t(g){return g*g*(3-2*g)}function Bt(g,_){let v=Math.floor(g),I=Math.floor(_),L=g-v,B=_-I,Y=vt(v,I),ie=vt(v+1,I),ne=vt(v,I+1),de=vt(v+1,I+1),Ae=_t(L),me=_t(B);return(Y*(1-Ae)+ie*Ae)*(1-me)+(ne*(1-Ae)+de*Ae)*me}function Jt(g,_){let v=0,I=1,L=1,B=0;for(let Y=0;Y<4;Y++)v+=Bt(g*L,_*L)*I,B+=I,I*=.5,L*=2;return v/B}let bt=9,Lt=4,un=9.5,Jn=140,oa=90;function fi(g,_){return(Jt(g*.035+10,_*.035+10)-.35)*bt}function ps(g,_){let v=[];if(s&&f){v.push(f);for(let L=1;L<=c;L++)p[L]&&v.push(p[L]);p[0]&&v.push(p[0])}else v.push(U);let I=1/0;for(let L of v)for(let B=0;B<=80;B++){let Y=L.getPoint(B/80),ie=Y.x-g,ne=Y.z-_,de=ie*ie+ne*ne;de<I&&(I=de)}return Math.sqrt(I)}function pi(g,_){let v=ps(g,_),I=Lt+4.2;if(v<I)return 0;if(j){let B=Math.hypot(g-j.x,_-j.z),Y=8.4;if(B<Y)return 0;let ie=Math.min(1,(B-Y)/10),ne=fi(g,_)*_t(ie),de=Math.min(1,(v-I)/12);return ne*_t(de)}let L=Math.min(1,(v-I)/12);return fi(g,_)*_t(L)}function ms(){let g=U.getPoint(.42),_=U.getTangent(.42).normalize(),v=new D(-_.z,0,_.x).normalize();j=g.clone().addScaledVector(v,un+3.5)}function Ys(){if(s&&h){ca();return}let g=[];for(let _=0;_<re;_++){let v=_/(re-1),I=(v-.5)*90,L=Math.sin(v*Math.PI*2)*11;g.push(new D(I,0,L))}U=new Cn(g,!1,"catmullrom",.5),Object.values(r).forEach(_=>{_.t=re>1?_.indice/(re-1):0,_.pos=U.getPoint(_.t).clone()})}function ca(){let g=at().filter(me=>me.parada.id!=="fin");g.sort((me,Pe)=>me.indice-Pe.indice);let _=u?r[u]:null,v=r[h],I=-48,L=-14,B=g.length,Y=[];for(let me=0;me<B;me++){let Pe=B>1?me/(B-1):0,Se=I+(L-I)*Pe,be=Math.sin(Pe*Math.PI)*3;Y.push(new D(Se,0,be))}Y.length<2&&Y.push(new D(L,0,0)),f=new Cn(Y,!1,"catmullrom",.5),U=f,g.forEach((me,Pe)=>{me.t=B>1?Pe/(B-1):1,me.pos=f.getPoint(me.t).clone()});let ie=v&&v.pos?v.pos.clone():new D(L,0,0),ne=ie,de=Math.max(1,c),Ae=de>1?.62:0;for(let me=1;me<=de;me++){let Pe=Te(me);if(!Pe.length)continue;let Se=0;de>1&&(Se=-Ae+2*Ae*((me-1)/(de-1)));let be=new D(Math.cos(Se),0,Math.sin(Se)).normalize(),Oe=new D(-be.z,0,be.x),Le=15,Ce=[ne.clone()];Pe.forEach((Vt,qt)=>{let Nt=Le*(qt+1),xi=Math.sin((qt+1)*.9)*3.2,In=ne.clone().addScaledVector(be,Nt).addScaledVector(Oe,xi);Ce.push(In)});let Xe=new Cn(Ce,!1,"catmullrom",.5);p[me]=Xe;let Ne=Ce.length-1;Pe.forEach((Vt,qt)=>{Vt.t=(qt+1)/Ne,Vt.pos=Xe.getPoint(Vt.t).clone()})}if(_){let me=ie.x+60+12;_.pos=new D(me,0,ie.z),_.t=1,p[0]=new Cn([ne.clone(),ne.clone().lerp(_.pos,.5),_.pos.clone()],!1,"catmullrom",.5)}}function la(){let g=Jn*1.7,_=Math.round(oa*1.7),v=new hi(g,g,_,_);v.rotateX(-Math.PI/2);let I=v.attributes.position,L=[],B=new qe("#8bc34a"),Y=new qe("#a5d165"),ie=new qe("#9ecb58"),ne=new qe("#b3d977");for(let Ae=0;Ae<I.count;Ae++){let me=I.getX(Ae),Pe=I.getZ(Ae),Se=pi(me,Pe);I.setY(Ae,Se);let be,Oe=Se/bt;Oe<.05?be=B:Oe<.4?be=B.clone().lerp(Y,Oe/.4):Oe<.7?be=Y.clone().lerp(ie,(Oe-.4)/.3):be=ie.clone().lerp(ne,(Oe-.7)/.3),L.push(be.r,be.g,be.b)}v.setAttribute("color",new Et(L,3)),v.computeVertexNormals();let de=new V(v,new je({vertexColors:!0,flatShading:!0,roughness:1}));de.receiveShadow=!0,y.add(de)}function Ui(g,_,v,I){_=_||Lt,v=v===void 0?.05:v;let L=I||U,B=200,Y=[],ie=[],ne=[],de=Math.floor(B*g);for(let me=0;me<=de;me++){let Pe=me/B,Se=L.getPoint(Pe),be=L.getTangent(Pe).normalize(),Oe=new D(-be.z,0,be.x).normalize(),Le=Se.clone().addScaledVector(Oe,_),Ce=Se.clone().addScaledVector(Oe,-_);Y.push(Le.x,v,Le.z),Y.push(Ce.x,v,Ce.z),ne.push(0,Pe*20),ne.push(1,Pe*20)}for(let me=0;me<de;me++){let Pe=me*2,Se=me*2+1,be=me*2+2,Oe=me*2+3;ie.push(Pe,Se,be,Se,Oe,be)}let Ae=new on;return Ae.setAttribute("position",new Et(Y,3)),Ae.setAttribute("uv",new Et(ne,2)),Ae.setIndex(ie),Ae.computeVertexNormals(),Ae}function w(g,_,v){v=v||{};let I=document.createElement("canvas");I.width=I.height=512;let L=I.getContext("2d");L.fillStyle=g,L.fillRect(0,0,512,512),v.rodadas&&[180,332].forEach(Y=>{let ie=L.createLinearGradient(Y-40,0,Y+40,0);ie.addColorStop(0,"rgba(255,255,255,0)"),ie.addColorStop(.5,"rgba(150,120,70,.14)"),ie.addColorStop(1,"rgba(255,255,255,0)"),L.globalAlpha=1,L.fillStyle=ie,L.fillRect(Y-40,0,80,512)});for(let Y=0;Y<420;Y++){let ie=Math.random()*512,ne=Math.random()*512,de=Math.random()*6+1.5;L.fillStyle=_[Math.random()*_.length|0],L.globalAlpha=.06+Math.random()*.12,L.beginPath(),L.ellipse(ie,ne,de,de*(.6+Math.random()*.5),Math.random()*6,0,Math.PI*2),L.fill()}L.globalAlpha=1;let B=new ui(I);return B.wrapS=B.wrapT=ls,B.anisotropy=8,B}function F(g,_){g.side=pn;let v=new je(g);return v.polygonOffset=!0,v.polygonOffsetFactor=-1-_,v.polygonOffsetUnits=-2-_*2,v}function X(g){let _=w("#7a4a28",["#8a5732","#6b3f22"]);_.repeat.set(1,12);let v=F({map:_,roughness:1},0),I=new V(Ui(1,Lt+2,.04,g),v);I.receiveShadow=!0,y.add(I);let L=w("#9c6238",["#ac7043","#8a5530","#b57c4c"],{rodadas:!0});L.repeat.set(1,10);let B=F({map:L,roughness:1},1),Y=new V(Ui(1,Lt+1.4,.12,g),B);Y.receiveShadow=!0,y.add(Y);let ie=new jr(.4,0),ne=["#b7ad9c","#a89c88","#c4bbab"];for(let de=0;de<40;de++){let Ae=de/40,me=g.getPoint(Ae),Pe=g.getTangent(Ae).normalize(),Se=new D(-Pe.z,0,Pe.x).normalize();[1,-1].forEach(be=>{if(Math.random()<.4)return;let Oe=new V(ie,new je({color:ne[Math.random()*ne.length|0],roughness:1,flatShading:!0})),Le=(Math.random()-.5)*.6;Oe.position.copy(me).addScaledVector(Se,be*(Lt+2+Le)),Oe.position.y=.16,Oe.rotation.set(Math.random(),Math.random(),Math.random()),Oe.scale.setScalar(.45+Math.random()*.6),Oe.castShadow=!0,Oe.receiveShadow=!1,y.add(Oe)})}}function Z(){if(s&&f){X(f);for(let v=1;v<=c;v++)p[v]&&X(p[v]);p[0]&&X(p[0])}else X(U);let g=w("#a86e40",["#ba7f4d","#996036"]);g.repeat.set(1,12);let _=F({map:g,roughness:1,emissive:new qe("#5a3418"),emissiveIntensity:.08},2);Q=new ct,Q.userData.mat=_,y.add(Q)}function q(){let g=Q.userData.mat;for(;Q.children.length;){let v=Q.children.pop();v.geometry&&v.geometry.dispose()}let _=(v,I)=>{if(!v||I<=0)return;let L=new V(Ui(Math.min(1,I),Lt+1.4,.16,v),g);Q.add(L)};if(s&&f){h&&a.has(h)&&_(f,1);for(let v=1;v<=c;v++){let I=Te(v);if(!I.length)continue;let L=0;I.forEach(B=>{(a.has(B.parada.id)||B.parada.id===o)&&(B.t||0)>L&&(L=B.t)}),L>0&&_(p[v],L)}u&&(a.has(u)||o===u)&&p[0]&&_(p[0],1)}else{let v=o?r[o]:null,I=v&&v.t||0;_(U,I)}}function Me(g,_,v){let I=document.createElement("canvas");I.width=I.height=256;let L=I.getContext("2d");L.clearRect(0,0,256,256),L.fillStyle="#ffffff",L.beginPath(),L.arc(128,128,120,0,Math.PI*2),L.fill(),L.fillStyle=v,L.beginPath(),L.arc(128,128,112,0,Math.PI*2),L.fill(),L.fillStyle=_,L.beginPath(),L.arc(128,128,96,0,Math.PI*2),L.fill();let B=L.createRadialGradient(96,84,8,128,128,110);B.addColorStop(0,"rgba(255,255,255,.55)"),B.addColorStop(.5,"rgba(255,255,255,0)"),L.fillStyle=B,L.beginPath(),L.arc(128,128,96,0,Math.PI*2),L.fill(),L.font='bold 150px "Fredoka One", system-ui, sans-serif',L.textAlign="center",L.textBaseline="middle",L.fillStyle="#ffffff",L.strokeStyle=v,L.lineWidth=8,L.strokeText(g,128,140),L.fillText(g,128,140);let Y=new ui(I);return Y.anisotropy=8,Y}function Fe(){ee=[];let g=new ct;y.add(g);let _=new je({color:"#8a5a2b",roughness:.9,flatShading:!0});e.paradas.forEach((v,I)=>{let L=r[v.id],B=L&&L.pos?L.pos:U.getPoint(I/(re-1)),Y=new ct;Y.position.set(B.x,0,B.z);let ie=new V(new St(.14,.14,3,12),_);ie.position.y=1.5,ie.castShadow=!0,Y.add(ie);let ne=v.id==="inicio"?"#facc15":v.id==="fin"?"#ec4899":"#f59e0b",de=v.id==="inicio"?"#a16207":v.id==="fin"?"#9d174d":"#b45309",Ae=Me(lt(v,I),ne,de),me=new mn({map:Ae,transparent:!0,depthWrite:!0}),Pe=new V(new hi(2.3,2.3),me);Pe.position.y=3.4,Pe.userData.baseY=3.4,Pe.castShadow=!1,Pe.receiveShadow=!1,Y.add(Pe);let Se=new V(new ks(1.55,.13,12,32),new mn({color:"#fde047"}));Se.position.y=3.4,Se.visible=!1,Y.add(Se),v.id==="inicio"&&(ie.visible=!1,Pe.visible=!1),g.add(Y),ee.push({grupo:Y,medallon:Pe,aro:Se,parada:v,indice:I,colorBase:ne,colorBorde:de})})}function Ye(g,_){let v=new ct,I=(Ae,me)=>new je({color:Ae,roughness:me===void 0?.85:me,flatShading:!0}),L=new V(new $e(4.8,3.4,4.4),I(g));L.position.y=1.7,L.castShadow=!0,L.receiveShadow=!0,v.add(L);let B=new V(new jt(4,2.4,4),I(_));B.position.y=4.6,B.rotation.y=Math.PI/4,B.castShadow=!0,v.add(B);let Y=new V(new $e(1.3,2.1,.15),I("#6b4226"));Y.position.set(0,1.05,2.22),v.add(Y);let ie=new V(new xt(.12,8,8),I("#f5d94a",.4));ie.position.set(.4,1.1,2.3),v.add(ie);let ne=I("#bfe6ff",.3);[-1.35,1.35].forEach(Ae=>{let me=new V(new $e(1,1,.08),ne);me.position.set(Ae,2.3,2.24),v.add(me);let Pe=new V(new $e(1.15,1.15,.05),I("#ffffff",.6));Pe.position.set(Ae,2.3,2.2),v.add(Pe)});let de=new V(new $e(.6,1.5,.6),I("#9c5b3b"));return de.position.set(1.3,5.2,-.6),de.castShadow=!0,v.add(de),v}function Qe(g){let _=new ct,v=(Pe,Se)=>new je({color:Pe,roughness:Se===void 0?.85:Se,flatShading:!0}),I="#cbb998",L="#b8a582",B=g||"#c0392b",Y=(Pe,Se,be,Oe)=>{for(let Le=0;Le<Oe;Le++){let Ce=new V(new $e(.9,1,1.1),v(L));Ce.position.set(-Pe/2+.9+Le*(Pe-1.8)/(Oe-1),Se,be),Ce.castShadow=!0,_.add(Ce)}},ie=(Pe,Se,be,Oe)=>{let Le=new V(new St(be,be*1.1,Oe,10),v(I));Le.position.set(Pe,Oe/2,Se),Le.castShadow=!0,Le.receiveShadow=!0,_.add(Le);let Ce=new V(new jt(be*1.35,be*2.4,10),v(B));Ce.position.set(Pe,Oe+be*1.2,Se),Ce.castShadow=!0,_.add(Ce);let Xe=new V(new St(.1,.1,2.4,6),v("#6b6b6b",.5));Xe.position.set(Pe,Oe+be*2.4+1.2,Se),_.add(Xe);let Ne=new V(new hi(2.2,1.3),new je({color:B,roughness:.7,side:pn}));Ne.position.set(Pe+1.1,Oe+be*2.4+1.7,Se),_.add(Ne)},ne=new V(new $e(7,9,6),v(I));ne.position.y=4.5,ne.castShadow=!0,ne.receiveShadow=!0,_.add(ne),Y(7,9.5,2.6,5),Y(7,9.5,-2.6,5);let de=new V(new $e(13,5,1.6),v(L));de.position.set(0,2.5,4.6),de.castShadow=!0,de.receiveShadow=!0,_.add(de),Y(13,5.8,4.6,8),ie(-6.5,4.6,1.6,8),ie(6.5,4.6,1.6,8),ie(-4,-3.2,1.4,10),ie(4,-3.2,1.4,10);let Ae=new V(new $e(2.8,3.6,.4),v("#4a3520"));Ae.position.set(0,1.8,5.45),_.add(Ae);let me=new V(new St(1.4,1.4,.4,12,1,!1,0,Math.PI),v("#4a3520"));return me.rotation.z=Math.PI,me.position.set(0,3.6,5.45),me.rotation.x=Math.PI/2,_.add(me),_}function ot(g){let _=(Be,Re)=>new je({color:Be,roughness:Re===void 0?.85:Re,flatShading:!0}),v=new ct,L={"expresion-artistica":{pared:"#f4d35e",techo:"#e63946",emoji:"\u{1F3A8}",detalle:"arte"},polimotor:{pared:"#8ecae6",techo:"#3a86ff",emoji:"\u26BD",detalle:"deporte"},multisaberes:{pared:"#e9c46a",techo:"#8a5a2b",emoji:"\u{1F4DA}",detalle:"libros"},multisensorial:{pared:"#a8dadc",techo:"#457b9d",emoji:"\u270B",detalle:"sentidos"},tecnologia:{pared:"#cdd7e0",techo:"#e76f51",emoji:"\u{1F916}",detalle:"tech"}}[g]||{pared:"#e8c07d",techo:"#c0392b",emoji:"\u{1F3E0}",detalle:"default"},B=8,Y=6,ie=7,ne=ie/2,de=new V(new $e(B,Y,ie),_(L.pared));de.position.y=Y/2,de.castShadow=!0,de.receiveShadow=!0,v.add(de);let Ae=new V(new $e(B+.4,.8,ie+.4),_("#9a9187"));Ae.position.y=.4,Ae.receiveShadow=!0,v.add(Ae),[[-B/2,ne],[B/2,ne]].forEach(([Be,Re])=>{let st=new V(new $e(.5,Y,.5),_("#ffffff",.7));st.position.set(Be,Y/2,Re),v.add(st)});let me=3.2,Pe=new V(new jt(B*.82,me,4),_(L.techo));Pe.position.y=Y+me/2-.2,Pe.rotation.y=Math.PI/4,Pe.castShadow=!0,v.add(Pe);let Se=new V(new St(B*.86,B*.86,.35,4),_("#5a3a22"));Se.position.y=Y-.05,Se.rotation.y=Math.PI/4,v.add(Se);let be=new V(new xt(.4,8,6),_("#f5d94a",.4));be.position.y=Y+me-.2,v.add(be);let Oe=new V(new $e(2.4,3.6,.15),_("#ffffff",.7));Oe.position.set(0,1.8,ne+.02),v.add(Oe);let Le=new V(new $e(2,3.2,.2),_("#6b4226"));Le.position.set(0,1.6,ne+.08),v.add(Le);let Ce=new V(new xt(.14,8,8),_("#f5d94a",.4));Ce.position.set(.7,1.6,ne+.2),v.add(Ce);let Xe=new V(new $e(3,.4,1.2),_("#b8b0a4"));Xe.position.set(0,.2,ne+.7),v.add(Xe),[-2.6,2.6].forEach(Be=>{let Re=new V(new $e(1.7,1.7,.1),_("#ffffff",.7));Re.position.set(Be,3.6,ne+.02),v.add(Re);let st=new V(new $e(1.4,1.4,.08),_("#bfe6ff",.3));st.position.set(Be,3.6,ne+.06),v.add(st);let mt=new V(new $e(.12,1.4,.1),_("#ffffff",.7));mt.position.set(Be,3.6,ne+.1),v.add(mt);let Ct=new V(new $e(1.4,.12,.1),_("#ffffff",.7));Ct.position.set(Be,3.6,ne+.1),v.add(Ct);let Ot=new V(new $e(1.9,.2,.4),_("#e0d7c8"));Ot.position.set(Be,2.75,ne+.18),v.add(Ot)});let Ne=new V(new $e(1,2.6,1),_("#9c5b3b"));Ne.position.set(2.4,Y+1.6,-1),Ne.castShadow=!0,v.add(Ne);let Vt=new V(new $e(1.2,.4,1.2),_("#6b4226"));Vt.position.set(2.4,Y+2.9,-1),v.add(Vt);let qt=document.createElement("canvas");qt.width=qt.height=160;let Nt=qt.getContext("2d");Nt.fillStyle="#ffffff",Nt.beginPath(),Nt.arc(80,80,76,0,Math.PI*2),Nt.fill(),Nt.strokeStyle=L.techo,Nt.lineWidth=10,Nt.beginPath(),Nt.arc(80,80,74,0,Math.PI*2),Nt.stroke(),Nt.font="92px serif",Nt.textAlign="center",Nt.textBaseline="middle",Nt.fillText(L.emoji,80,88);let xi=new ui(qt),In=new V(new Zn(1.6,28),new mn({map:xi,transparent:!0,depthTest:!0}));In.position.set(0,Y-1.2,ne+.15),v.add(In),[-.8,.8].forEach(Be=>{let Re=new V(new St(.04,.04,1.4,4),_("#5a3a22"));Re.position.set(Be,Y-.3,ne+.1),Re.rotation.z=Be>0?-.3:.3,v.add(Re)});let Mt=ne+2.2;if(L.detalle==="arte"){let Be=_("#8a5a2b");[-.5,.5].forEach(Ct=>{let Ot=new V(new St(.1,.1,3,6),Be);Ot.position.set(2.6+Ct,1.5,Mt),Ot.rotation.x=.25,v.add(Ot)});let Re=new V(new St(.1,.1,3,6),Be);Re.position.set(2.6,1.5,Mt-.7),Re.rotation.x=-.4,v.add(Re);let st=new V(new $e(2,1.7,.12),_("#ffffff",.6));st.position.set(2.6,2.3,Mt),v.add(st),[["#e63946",-.4,.2],["#457b9d",.3,-.1],["#2a9d8f",0,.4]].forEach(([Ct,Ot,Sn])=>{let yi=new V(new $e(.7,.35,.14),_(Ct));yi.position.set(2.6+Ot,2.3+Sn,Mt+.02),v.add(yi)});let mt=new V(new St(.7,.7,.1,16),_("#c9a56a"));mt.position.set(-2.6,.6,Mt),mt.rotation.x=Math.PI/2.2,v.add(mt),["#e63946","#3a86ff","#ffd166"].forEach((Ct,Ot)=>{let Sn=new V(new xt(.16,8,8),_(Ct));Sn.position.set(-2.6+Math.cos(Ot*2)*.35,.72,Mt+Math.sin(Ot*2)*.35),v.add(Sn)})}else if(L.detalle==="deporte"){let Be=new V(new xt(.9,14,12),_("#ffffff",.5));Be.position.set(2.6,.9,Mt),v.add(Be),[[0,.9,.9],[.5,.9,.6],[-.5,.9,.6]].forEach(([Ct,Ot,Sn])=>{let yi=new V(new xt(.24,6,5),_("#222"));yi.position.set(2.6+Ct*.6,Ot,Mt+Sn*.4-.4),v.add(yi)});let Re=new V(new St(.12,.12,4,8),_("#888"));Re.position.set(-2.8,2,Mt-.4),v.add(Re);let st=new V(new $e(1.6,1.1,.1),_("#ffffff",.6));st.position.set(-2.8,3.4,Mt-.4),v.add(st);let mt=new V(new ks(.5,.09,8,20),_("#e76f51"));mt.position.set(-2.8,3,Mt),mt.rotation.x=Math.PI/2,v.add(mt)}else if(L.detalle==="libros"){["#e63946","#457b9d","#2a9d8f","#f4a261"].forEach((mt,Ct)=>{let Ot=new V(new $e(2,.5,1.4),_(mt));Ot.position.set(2.4,.5+Ct*.55,Mt),Ot.rotation.y=Ct*.12,v.add(Ot)});let Be=new V(new xt(.8,14,12),_("#3a86ff"));Be.position.set(-2.6,1,Mt),v.add(Be);let Re=new V(new xt(.82,8,6),_("#2a9d8f",.9));Re.scale.set(.6,1,.6),Re.position.set(-2.6,1,Mt),v.add(Re);let st=new V(new St(.06,.06,2,6),_("#888"));st.position.set(-2.6,1,Mt),st.rotation.z=.4,v.add(st)}else if(L.detalle==="sentidos"){let Be=new V(new xt(.8,14,12),_("#e63946"));Be.position.set(-2.6,.8,Mt),v.add(Be);let Re=new V(new $e(1.3,1.3,1.3),_("#2a9d8f"));Re.position.set(0,.65,Mt+.6),Re.rotation.y=.4,v.add(Re);let st=new V(new jt(.7,1.5,10),_("#f4a261"));st.position.set(2.6,.75,Mt),v.add(st);let mt=new V(new St(.5,.5,1.2,12),_("#8e44ad"));mt.position.set(1.4,.6,Mt+.8),v.add(mt)}else if(L.detalle==="tech"){let Be=new V(new $e(1.2,1.4,.9),_("#adb5bd"));Be.position.set(2.6,1.2,Mt),v.add(Be);let Re=new V(new $e(.9,.8,.8),_("#ced4da"));Re.position.set(2.6,2.3,Mt),v.add(Re),[-.22,.22].forEach(Ot=>{let Sn=new V(new xt(.13,8,8),_("#4dff88",.3));Sn.position.set(2.6+Ot,2.35,Mt+.4),v.add(Sn)});let st=new V(new St(.05,.05,.7,6),_("#555"));st.position.set(2.6,3,Mt),v.add(st);let mt=new V(new xt(.14,8,8),_("#e76f51"));mt.position.set(2.6,3.4,Mt),v.add(mt);let Ct=new V(new $e(1.6,1.2,.15),_("#1d3557"));Ct.position.set(-2.6,1.2,Mt),v.add(Ct),[-.4,0,.4].forEach((Ot,Sn)=>[.3,-.3].forEach(yi=>{let yc=new V(new $e(.28,.28,.06),_(["#4dff88","#ffd166","#ff4d4d"][Sn%3],.3));yc.position.set(-2.6+Ot,1.2+yi,Mt+.1),v.add(yc)}))}return v}function tt(g){let _=new ct,v=new V(new St(.22,.3,1.6,6),new je({color:"#7a5a30",roughness:1,flatShading:!0}));v.position.y=.8,v.castShadow=!0,_.add(v);let I=new V(new Pn(1.5,1),new je({color:g,roughness:1,flatShading:!0}));return I.position.y=2.6,I.scale.y=.9,I.castShadow=!0,_.add(I),_}function it(g){let _=new ct,v=new je({color:g,roughness:1,flatShading:!0});for(let I=0;I<3;I++){let L=new V(new Pn(.5+I%2*.22,0),v);L.position.set((I-1)*.55,.45+I%2*.12,I%2?.2:-.2),L.castShadow=!0,_.add(L)}return _}function Ut(g){let _=new ct,v=new V(new St(.04,.04,.6,5),new je({color:"#3f7a4b",roughness:1}));v.position.y=.3,_.add(v);let I=new V(new xt(.12,8,8),new je({color:"#ffd166",roughness:.7}));I.position.y=.62,_.add(I);let L=new je({color:g,roughness:.7});for(let B=0;B<5;B++){let Y=B/5*Math.PI*2,ie=new V(new xt(.1,6,6),L);ie.position.set(Math.cos(Y)*.18,.62,Math.sin(Y)*.18),ie.scale.set(1.4,.6,1),_.add(ie)}return _}function tn(){let g=new ct,_=new je({color:"#a9764a",roughness:.9,flatShading:!0}),v=new V(new $e(2.2,.18,.8),_);return v.position.y=.7,v.castShadow=!0,g.add(v),[[-.9,.3],[.9,.3],[-.9,-.3],[.9,-.3]].forEach(([I,L])=>{let B=new V(new $e(.16,.7,.16),_);B.position.set(I,.35,L),g.add(B)}),[1.05,1.4].forEach(I=>{let L=new V(new $e(2.2,.16,.12),_);L.position.set(0,I,-.32),g.add(L)}),[-.9,.9].forEach(I=>{let L=new V(new $e(.14,.9,.14),_);L.position.set(I,1.05,-.32),g.add(L)}),g}function Ht(){let g=r.inicio;if(!g||!g.pos)return;let _=g.pos.x-5,v=g.pos.z-14;De={x:_,z:v,r:7};let I=ot(rt);I.position.set(_,0,v),I.rotation.y=Math.PI*.18,y.add(I);let L=["#3f7a4b","#4b8c57","#356b41","#5a9c63","#2f6b3f"];[[-8,-3],[-10,2],[-7,4],[-11,-5],[-9,-8],[-13,0],[-6,8],[-12,6],[-8,10]].forEach(([Le,Ce],Xe)=>{let Ne=tt(L[Xe%L.length]);Ne.position.set(_+Le,0,v+Ce),Ne.scale.setScalar(.7+Xe*7%5*.12),y.add(Ne)}),[[-6,3],[-5.5,-2],[5,2],[-4.5,6],[5.5,6],[-7,-1]].forEach(([Le,Ce],Xe)=>{let Ne=it(L[(Xe+2)%L.length]);Ne.position.set(_+Le,0,v+Ce),Ne.scale.setScalar(.9+Xe%3*.2),y.add(Ne)});let ie=["#e63946","#ffd166","#f472b6","#a78bfa","#4dabf7"];[[-1.6,5.2],[1.6,5.2],[-1.8,6.5],[1.8,6.5],[-4.2,4.8],[4.2,4.4],[-1.4,7.8],[1.4,7.8],[-5,2],[5.2,2.5]].forEach(([Le,Ce],Xe)=>{let Ne=Ut(ie[Xe%ie.length]);Ne.position.set(_+Le,0,v+Ce),Ne.scale.setScalar(.9+Xe%2*.3),y.add(Ne)});let de=new je({color:"#c2bcae",roughness:1,flatShading:!0}),Ae=new D(_,0,v+3.5),me=new D(g.pos.x-1,0,g.pos.z+.5),Pe=Ae.clone().lerp(me,.5).add(new D(1.2,0,0)),Se=new Cn([Ae,Pe,me],!1,"catmullrom",.5),be=11;for(let Le=0;Le<be;Le++){let Ce=Le/(be-1),Xe=Se.getPoint(Ce),Ne=new V(new St(.8,.8,.12,6),de);Ne.position.set(Xe.x,.06,Xe.z),Ne.rotation.y=Le*.5,Ne.scale.set(1,1,.85+Le%2*.2),Ne.receiveShadow=!0,y.add(Ne)}let Oe=tn();Oe.position.set(_-5.5,0,v+8),Oe.rotation.y=Math.PI*.75,y.add(Oe)}function En(){let g=r.inicio;if(!g||!g.pos)return;let _=new ct,v=(st,mt)=>new je({color:st,roughness:mt===void 0?.85:mt,flatShading:!0}),I=4.2,L=3.4,B=3.2,Y=new V(new St(I+.6,I+.9,.5,16),v("#c9b79c"));Y.position.y=.25,Y.receiveShadow=!0,_.add(Y);let ie=new V(new St(I,I,L,16,1,!0),v("#fff3e0",.9));ie.material.side=pn,ie.position.y=.5+L/2,ie.castShadow=!0,_.add(ie);let ne=document.createElement("canvas");ne.width=256,ne.height=64;let de=ne.getContext("2d"),Ae=["#e63946","#ffffff","#f4a261","#ffffff","#457b9d","#ffffff","#2a9d8f","#ffffff"],me=ne.width/Ae.length;Ae.forEach((st,mt)=>{de.fillStyle=st,de.fillRect(mt*me,0,me+1,ne.height)});let Pe=new ui(ne);Pe.wrapS=ls,Pe.repeat.set(1,1);let Se=new V(new jt(I+.8,B,16),new je({map:Pe,roughness:.8,flatShading:!0}));Se.position.y=.5+L+B/2-.1,Se.castShadow=!0,_.add(Se);let be=new V(new St(.06,.06,1.2,6),v("#8a5a2b"));be.position.y=.5+L+B+.4,_.add(be);let Oe=new V(new jt(.35,.6,3),v("#e63946",.6));Oe.rotation.z=-Math.PI/2,Oe.position.set(.35,.5+L+B+.7,0),_.add(Oe);let Le=new V(new $e(2.4,L*.8,.2),v("#3a2b1a",1));Le.position.set(0,.5+L*.4,I-.05),_.add(Le);let Ce=Rt();Ce.position.set(0,.5+L+B+1.8,0),Ce.userData.baseY=Ce.position.y,_.add(Ce),Ke=Ce;let Xe=g.pos.x-20,Ne=g.pos.z+7;_.position.set(Xe,0,Ne),_.rotation.y=Math.atan2(g.pos.x-Xe,g.pos.z-Ne),y.add(_),et=_,Ge={x:Xe,z:Ne,r:I+1.5};let Vt=new D(Xe,0,Ne),Nt=new D(g.pos.x,0,g.pos.z).clone().sub(Vt).setY(0).normalize();ft=Vt.clone().add(Nt.clone().multiplyScalar(I+1.2));let xi=new je({color:"#c2bcae",roughness:1,flatShading:!0}),In=new D(g.pos.x-1,0,g.pos.z+1),Mt=Vt.clone().add(Nt.clone().multiplyScalar(I-.4)),Be=In.distanceTo(Mt),Re=Math.max(10,Math.round(Be/1));for(let st=0;st<=Re;st++){let mt=In.clone().lerp(Mt,st/Re),Ct=new V(new St(.9,.9,.12,6),xi);Ct.position.set(mt.x,.06,mt.z),Ct.rotation.y=st*.7,Ct.scale.set(1,1,.9+st%2*.18),Ct.receiveShadow=!0,y.add(Ct)}}function Rt(){let g=document.createElement("canvas");g.width=256,g.height=128;let _=g.getContext("2d");_.fillStyle="#ffffff",_.strokeStyle="#2f8fd4",_.lineWidth=10,ht(_,8,8,240,112,20),_.fill(),_.stroke(),_.textAlign="center",_.textBaseline="middle",_.font="54px system-ui, sans-serif",_.fillText("\u{1F3AE}",128,48),_.fillStyle="#1f6ba3",_.font="bold 30px system-ui, sans-serif",_.fillText("JUEGOS",128,96);let v=new ui(g),I=new V(new hi(3.4,1.7),new mn({map:v,transparent:!0}));return I.userData.esZonaJuegos=!0,I}function ht(g,_,v,I,L,B){g.beginPath(),g.moveTo(_+B,v),g.arcTo(_+I,v,_+I,v+L,B),g.arcTo(_+I,v+L,_,v+L,B),g.arcTo(_,v+L,_,v,B),g.arcTo(_,v,_+I,v,B),g.closePath()}function gs(){let g=new ct;y.add(g);let _=[["#e8c07d","#c0392b"],["#a9d18e","#7d5a3c"],["#f4b6c2","#8e44ad"],["#9fd3e0","#2c7a7b"]],v=F({map:function(){let Y=w("#9c6238",["#ac7043","#8a5530"]);return Y.repeat.set(1,4),Y}(),roughness:1},1),I=(Y,ie)=>{let ne=new Cn([Y.clone(),Y.clone().lerp(ie,.5),ie.clone()],!1,"catmullrom",.5),de=new V(Ui(1,Lt+.6,.13,ne),v);de.receiveShadow=!0,g.add(de)},L=(Y,ie,ne)=>{if(!Y||!Y.pos||!ie)return;let de=ie.getTangent(.999).normalize(),Ae=Y.pos.clone().addScaledVector(de,6.5),me=Ye(..._[ne%_.length]);me.position.set(Ae.x,0,Ae.z),me.rotation.y=Math.atan2(-de.x,-de.z),me.scale.setScalar(1.1),g.add(me);let Pe=Ae.clone().addScaledVector(de,-2.6);I(Y.pos.clone(),Pe),ye[Y.parada.id]=Pe.clone()},B=(Y,ie)=>{if(!Y||!Y.pos)return;let ne=Qe("#"+Tt.getHexString()),de=Y.pos.clone().addScaledVector(ie,12);ne.position.set(de.x,0,de.z),ne.rotation.y=Math.atan2(-ie.x,-ie.z),g.add(ne);let Ae=de.clone().addScaledVector(ie,-6);I(Y.pos.clone(),Ae)};if(s){for(let ne=1;ne<=c;ne++){let de=Te(ne).find(Ae=>ze(Ae.parada));L(de,p[ne],ne-1)}let Y=u?r[u]:null,ie=p[0]?p[0].getTangent(.999).normalize():new D(1,0,0);B(Y,ie)}else{let Y=Object.values(r).find(de=>ze(de.parada));L(Y,U,0);let ie=u?r[u]:null,ne=U.getTangent(.999).normalize();B(ie,ne)}Un()}function It(){let g=new ct,_=new je({color:"#a9764a",roughness:.9,flatShading:!0}),v=(Lt+1.4)*2;for(let L=0;L<=4;L++){let B=-v/2+v/4*L,Y=new V(new St(.18,.2,2.2,8),_);Y.position.set(B,1.1,0),Y.castShadow=!0,g.add(Y);let ie=new V(new xt(.22,8,6),_);ie.position.set(B,2.2,0),g.add(ie)}[.75,1.5].forEach(L=>{let B=new V(new $e(v,.22,.3),_);B.position.set(0,L,0),B.castShadow=!0,g.add(B)});let I=new V(new $e(1.4,.9,.08),new je({color:"#e0a83a",roughness:.7}));return I.position.set(0,2.6,.05),g.add(I),g}function Un(){if(se={},!s||!h||!r[h]||!r[h].pos)return;let g=r[h].pos;for(let _=1;_<=c;_++){let v=gt(_);if(!v||!r[v]||!r[v].pos||!p[_])continue;let I=g.clone().lerp(r[v].pos,.5),L=p[_].getTangent(.15).normalize(),B=It();B.position.set(I.x,0,I.z),B.rotation.y=Math.atan2(L.x,L.z),y.add(B),se[_]=B}}function Zs(){let g=new ct;y.add(g);let _=["#3f7a4b","#4b8c57","#356b41","#5a9c63","#2f6b3f"];j||ms();function v(Se,be,Oe,Le){let Ce=new ct,Xe=new V(new St(.22,.3,1.4,6),new je({color:"#6b4f2a",roughness:1,flatShading:!0}));Xe.position.y=.7,Xe.castShadow=!0,Ce.add(Xe);let Ne=2+(Math.random()*2|0);for(let Vt=0;Vt<Ne;Vt++){let qt=new V(new jt(1.5-Vt*.35,1.6,7),new je({color:Le,roughness:1,flatShading:!0}));qt.position.y=1.9+Vt*1,qt.castShadow=!0,Ce.add(qt)}return Ce.position.set(Se,be,Oe),Ce.scale.setScalar(.7+Math.random()*.8),Ce}function I(Se,be,Oe,Le){let Ce=new ct,Xe=new V(new St(.2,.28,1.6,6),new je({color:"#7a5a30",roughness:1,flatShading:!0}));Xe.position.y=.8,Xe.castShadow=!0,Ce.add(Xe);let Ne=new V(new Pn(1.5,1),new je({color:Le,roughness:1,flatShading:!0}));return Ne.position.y=2.6,Ne.castShadow=!0,Ne.scale.y=.9,Ce.add(Ne),Ce.position.set(Se,be,Oe),Ce.scale.setScalar(.7+Math.random()*.7),Ce}function L(Se,be,Oe,Le){let Ce=new ct;for(let Xe=0;Xe<3;Xe++){let Ne=new V(new Pn(.5+Math.random()*.3,0),new je({color:Le,roughness:1,flatShading:!0}));Ne.position.set((Math.random()-.5)*.7,.4+Math.random()*.2,(Math.random()-.5)*.7),Ne.castShadow=!0,Ce.add(Ne)}return Ce.position.set(Se,be,Oe),Ce}function B(Se,be,Oe){let Le=new ct,Ce=new V(new St(.03,.03,.5,4),new je({color:"#3f7a4b"}));Ce.position.y=.25,Le.add(Ce);let Xe=["#f87171","#fbbf24","#f472b6","#a78bfa","#60a5fa"][Math.random()*5|0],Ne=new V(new Pn(.16,0),new je({color:Xe,roughness:.7}));return Ne.position.y=.55,Le.add(Ne),Le.position.set(Se,be,Oe),Le}function Y(Se,be,Oe){let Le=new V(new Pn(.6+Math.random()*.6,0),new je({color:"#8a8175",roughness:1,flatShading:!0}));return Le.position.set(Se,be+.3,Oe),Le.rotation.set(Math.random(),Math.random(),Math.random()),Le.castShadow=!0,Le.receiveShadow=!0,Le}let ie=0,ne=0;for(;ne<130&&ie<1400;){ie++;let Se=(Math.random()-.5)*Jn*.92,be=(Math.random()-.5)*Jn*.92;if(ps(Se,be)<un||j&&Math.hypot(Se-j.x,be-j.z)<le||De&&Math.hypot(Se-De.x,be-De.z)<De.r||Ge&&Math.hypot(Se-Ge.x,be-Ge.z)<Ge.r)continue;let Le=pi(Se,be),Ce=_[Math.random()*_.length|0],Xe=Math.random(),Ne;Xe<.42?Ne=v(Se,Le,be,Ce):Xe<.62?Ne=I(Se,Le,be,Ce):Xe<.78?Ne=L(Se,Le,be,Ce):Xe<.9?Ne=B(Se,Le,be):Ne=Y(Se,Le,be),g.add(Ne),ne++}let de=new je({color:"#5b7c6a",roughness:1,flatShading:!0}),Ae=new je({color:"#e8eef2",roughness:1,flatShading:!0}),me=14,Pe=Jn*.62;for(let Se=0;Se<me;Se++){let be=Se/me*Math.PI*2+Math.random()*.2,Oe=Math.cos(be)*Pe,Le=Math.sin(be)*Pe,Ce=16+Math.random()*14,Xe=new V(new jt(9+Math.random()*5,Ce,6),de);Xe.position.set(Oe,Ce/2-2,Le),Xe.rotation.y=Math.random(),g.add(Xe);let Ne=new V(new jt(3.2,Ce*.28,6),Ae);Ne.position.set(Oe,Ce-Ce*.14-2,Le),Ne.rotation.y=Xe.rotation.y,g.add(Ne)}mi(g)}function mi(g){let _=j||U.getPoint(.5),v=new ct;v.position.set(_.x,0,_.z);let I=new V(new Zn(7.4,40),function(){let Y=new je({color:"#8a6a44",roughness:1});return Y.polygonOffset=!0,Y.polygonOffsetFactor=-1,Y.polygonOffsetUnits=-2,Y}());I.rotation.x=-Math.PI/2,I.position.y=.05,I.scale.set(1,.72,1),I.receiveShadow=!0,v.add(I);function L(Y,ie,ne,de){let Ae=new je({color:ie,roughness:.25,metalness:0,emissive:new qe(ie),emissiveIntensity:.18});Ae.polygonOffset=!0,Ae.polygonOffsetFactor=-2-de,Ae.polygonOffsetUnits=-4-de*2;let me=new V(new Zn(Y,40),Ae);return me.rotation.x=-Math.PI/2,me.position.y=ne,me.scale.set(1,.72,1),me}v.add(L(6.4,"#5fb3e6",.08,0)),v.add(L(4.6,"#3f9fe0",.1,1));let B=new V(new Zn(2.2,24),function(){return new mn({color:14676735,transparent:!0,opacity:.35,depthWrite:!1})}());B.rotation.x=-Math.PI/2,B.position.set(-2,.12,-1.4),B.scale.set(1,.5,1),v.add(B),g.add(v)}function _s(){he=ph(y,Jn)}function Xt(g){he&&he.animar(g)}function Nn(){ve=mh(y,j,S)}function xs(g,_){ve&&ve.animar(g,_)}function cn(){J||(J=_h(y));let g=u?r[u]:null;J.iniciar(g&&g.pos?g.pos:null)}function ys(g){J&&J.animar(g)}function ha(){T=new ct;let g="#ffcfa3",_="#6b4423",v="#4f7bd0",I="#b23a2d",L="#d4d8de",B="#c23e30",Y=(Be,Re)=>new je({color:Be,roughness:Re===void 0?.6:Re,flatShading:!0}),ie=new je({color:g,roughness:.9,flatShading:!1,emissive:new qe("#c98d5e"),emissiveIntensity:.5}),ne=new V(new Zn(.85,24),new mn({color:1715738,transparent:!0,opacity:.22,depthWrite:!1}));ne.rotation.x=-Math.PI/2,ne.position.y=.06,T.add(ne);let de=Y(I,.8),Ae=Y(g,.8);function me(Be){let Re=new ct;Re.position.set(.3*Be,.95,0);let st=new V(new di(.24,.35,4,8),de);st.position.y=-.1,Re.add(st);let mt=new V(new St(.16,.13,.5,8),Ae);return mt.position.y=-.55,Re.add(mt),Re}H=me(-1),T.add(H),K=me(1),T.add(K);let Pe=Y(L,.5),Se=Y("#7a7f88",.6);function be(){let Be=new ct,Re=new V(new $e(.3,.2,.5),Pe);Re.position.z=.08,Be.add(Re);let st=new V(new $e(.32,.08,.54),Se);return st.position.set(0,-.11,.1),Be.add(st),Be}G=be(),G.position.set(-.3,.24,.05),T.add(G),$=be(),$.position.set(.3,.24,.05),T.add($),P=new ct,P.position.y=1.55,T.add(P);let Oe=new V(new di(.42,.5,6,12),Y(v,.55));Oe.scale.set(1.05,1,.8),P.add(Oe);let Le=new V(new St(.2,.24,.12,10),Y("#ffffff",.5));Le.position.y=.42,P.add(Le);let Ce=new V(new $e(.5,.62,.28),Y(B,.6));Ce.position.set(0,1.55,-.42),T.add(Ce),[-.22,.22].forEach(Be=>{let Re=new V(new $e(.08,.6,.06),Y(B,.6));Re.position.set(Be,1.6,.34),T.add(Re)});function Xe(Be){let Re=new ct;Re.position.set(.5*Be,1.9,0);let st=new V(new di(.13,.55,4,8),Ae);st.position.y=-.32,Re.add(st);let mt=new V(new xt(.15,10,8),Ae);return mt.position.y=-.62,Re.add(mt),Re}b=Xe(-1),T.add(b),R=Xe(1),T.add(R),N=new ct,N.position.y=2.42,T.add(N);let Ne=new V(new xt(.5,18,16),ie);Ne.scale.set(1,1.05,.95),N.add(Ne),[-.48,.48].forEach(Be=>{let Re=new V(new xt(.1,8,8),ie);Re.position.set(Be,0,0),N.add(Re)});let Vt=new V(new xt(.07,8,8),ie);Vt.position.set(0,-.04,.5),N.add(Vt);let qt=Y(_,.7),Nt=new V(new xt(.54,16,14,0,Math.PI*2,0,Math.PI*.62),qt);Nt.position.y=.08,N.add(Nt);for(let Be=0;Be<5;Be++){let Re=new V(new jt(.16,.34,5),qt);Re.position.set(-.3+Be*.15,.42+Be%2*.08,.05),Re.rotation.z=(Be-2)*.18,N.add(Re)}let xi=new je({color:"#f2937a",roughness:.9,transparent:!0,opacity:.55});[-.28,.28].forEach(Be=>{let Re=new V(new Zn(.11,12),xi);Re.position.set(Be,-.08,.44),N.add(Re)});let In=new je({color:"#fff",roughness:.3}),Mt=new je({color:"#3a2415",roughness:.3});[-.19,.19].forEach(Be=>{let Re=new V(new xt(.13,14,12),In);Re.position.set(Be,.06,.4),Re.scale.set(1,1.15,.6),N.add(Re);let st=new V(new xt(.07,10,10),Mt);st.position.set(Be,.06,.5),N.add(st);let mt=new V(new xt(.025,6,6),In);mt.position.set(Be+.03,.11,.55),N.add(mt);let Ct=new V(new $e(.16,.04,.04),qt);Ct.position.set(Be,.24,.42),N.add(Ct)}),ue=new V(new xt(.1,12,10),new je({color:"#7a2e2e",roughness:.6})),ue.position.set(0,-.2,.44),ue.scale.set(1.3,.5,.5),N.add(ue),T.scale.setScalar(1.5),y.add(T),Js(0)}function Js(g){let _=null;if(typeof g=="string"&&r[g]&&r[g].pos)_=r[g].pos;else if(typeof g=="number"){let v=e.paradas[g];v&&r[v.id]&&r[v.id].pos?_=r[v.id].pos:_=U.getPoint(g/(re-1))}_||(_=U.getPoint(0)),T.position.set(_.x,0,_.z)}function xh(){z=new Xs(16774368,1.25),z.position.set(-40,60,30),z.castShadow=!0;let g=S?1024:2048;z.shadow.mapSize.set(g,g),z.shadow.camera.left=-60,z.shadow.camera.right=60,z.shadow.camera.top=42,z.shadow.camera.bottom=-42,z.shadow.camera.near=1,z.shadow.camera.far=220,z.shadow.bias=-5e-4,z.shadow.normalBias=.08,z.shadow.radius=4,y.add(z),E.shadowMap.autoUpdate=!1,E.shadowMap.needsUpdate=!0,y.add(new ea(15397887,10470506,1.55));let _=new Xs(16777215,.25);_.position.set(40,30,-30),y.add(_)}function yh(){let g=new qe("#7ec8f0").lerp(Tt,.12).lerp(new qe("#ffffff"),.12);y.background=g,y.fog=new Xr(g.getHex(),120,230)}let ua=new D,da=new D;function ec(g){let _=T.position,v=_.clone();if(M){let Y=pe(),ie=Y.length?Ve(Y[0]):null;ie&&(v=_.clone().lerp(ie.grupo.position,.42))}let I=new D(v.x-9,34,v.z+48),L=new D(v.x+2,2,v.z-6),B=g?1:.05;da.lerp(I,B),ua.lerp(L,B),C.position.copy(da),C.lookAt(ua)}function Ni(){let g=pe();ee.forEach((_,v)=>{let I=_.parada.id,L=g.indexOf(I)>=0,B=a.has(I)&&I!=="inicio"&&I!=="fin"&&I!==o;_.aro.visible=L;let Y=_.medallon.material,ie=_.colorBase,ne=_.colorBorde,de=lt(_.parada,v);B?(ie="#22c55e",ne="#15803d",de="\u2713"):L&&(ie="#fde047",ne="#ca8a04"),Y.map&&Y.map.dispose(),Y.map=Me(de,ie,ne),Y.needsUpdate=!0,_.grupo.scale.setScalar(L?1.18:1)}),xe()}let $s,Ks;function vh(g,_){if(x||k)return;if(Ks.x=g/window.innerWidth*2-1,Ks.y=-(_/window.innerHeight)*2+1,$s.setFromCamera(Ks,C),et){let B=[];if(et.traverse(Y=>{Y.isMesh&&B.push(Y)}),$s.intersectObjects(B,!1)[0]){Mh();return}}if(!M)return;let v=[];ee.forEach(B=>B.grupo.traverse(Y=>{Y.isMesh&&(Y.userData.estId=B.parada.id,v.push(Y))}));let I=$s.intersectObjects(v,!1)[0];if(!I)return;let L=I.object.userData.estId;if(L===o&&a.has(L)){let B=Ve(L);B&&dc(B.indice)}else Je(L)&&ic(L)}function Mh(){if(x||Ie||k||!ft||!T)return;let g=T.position.clone();g.y=0;let _=ft.clone();if(_.y=0,Ze={pos:g.clone(),rotY:T.rotation.y},g.distanceTo(_)<.6){tc();return}$n=new Cn([g,_],!1,"catmullrom",.5),Oi=0,vs=1,x=!0,Ft=!0,He=function(){tc()},T.visible=!0,Ts(),pa=Math.max(1200,g.distanceTo(_)*85),fa=performance.now()}function tc(){if(k||!window.BancoJuegos)return;k=!0;let g=document.createElement("div");g.className="rn3d-juegos-capa",i.$paso[0].appendChild(g);let _=e&&e.ambiente&&e.ambiente.color_hex||"";window.BancoJuegos.abrir({$paso:window.jQuery(g),color:_,onVolver:function(){k=!1,g.remove(),Ze&&T&&(T.position.copy(Ze.pos),T.rotation.y=Ze.rotY,Ze=null)}})}let fa=0,pa=0,ma=null,$n=null,Oi=0,vs=1,nc=null;function Eh(g,_){let v=r[g],I=r[_];if(!v||!I)return null;let L=v.rama,B=I.rama;if(s&&f){if(L===0&&g!==u&&(B===0&&_!==u))return{curva:f,t0:v.t||0,t1:I.t||0};if(_===u&&p[0])return{curva:p[0],t0:0,t1:1};let ne=B>0?B:L;if(ne>0&&p[ne]){let de=g===h?0:v.t||0,Ae=_===h?0:I.t||0;return{curva:p[ne],t0:de,t1:Ae}}}return{curva:U,t0:v.t||0,t1:I.t||0}}function ga(g,_){if(x||Ie||!g||g===o){_&&_();return}let v=Eh(o,g);if(!v){_&&_();return}T.visible=!0,gi(),x=!0,Ts(),$n=v.curva,Oi=v.t0,vs=v.t1,nc=g,ma=_||null;let I=$n.getPoint(Oi),L=$n.getPoint(vs);pa=Math.max(1400,I.distanceTo(L)*85),fa=performance.now();let B=Ve(g);B&&(t=B.indice),Bi(!0)}function ic(g,_){if(typeof g=="number"&&(g=(e.paradas[g]||{}).id),x||!g||g===o){_&&_();return}if(!Je(g)){_&&_();return}ga(g,_)}let Ms=!1;function Sh(){if(Ms||!u)return;Ms=!0;let g=()=>{if(!s||o===h){_();return}ga(h,()=>setTimeout(_,300))},_=()=>{ga(u,()=>{Ms=!1})};g()}let Es=null;function bh(g){if(!Es)return;let _=Es,v=Math.min(1,(g-_.ini)/_.dur),I=v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;if(_.modo==="entrar"){T.position.lerpVectors(_.desde,_.puerta,I);let L=1-I;T.scale.setScalar(_.base*Math.max(.001,L)),T.visible=I<.98;let B=Math.sin(g/80);H&&(H.rotation.x=B*.7,K.rotation.x=-B*.7)}else{T.visible=!0,T.position.lerpVectors(_.puerta,_.desde,I);let L=I;T.scale.setScalar(_.base*Math.max(.001,L));let B=Math.sin(g/80);H&&(H.rotation.x=B*.7,K.rotation.x=-B*.7)}if(v>=1){T.scale.setScalar(_.base),H&&(H.rotation.x=0,K.rotation.x=0),_.modo==="entrar"?T.visible=!1:T.visible=!0;let L=_.onFin;Es=null,Ie=!1,L&&L()}}function wh(g){let _=ye[o];if(!_){g&&g();return}Ie=!0,Es={modo:"entrar",ini:performance.now(),dur:900,desde:T.position.clone(),puerta:new D(_.x,0,_.z),base:T.scale.x,onFin:g||null}}function sc(g){let _=ye[o];if(!_){T.visible=!0,g&&g();return}Ie=!0;let v=Ve(o),I=v?v.grupo.position.clone():T.position.clone();Es={modo:"salir",ini:performance.now(),dur:900,desde:new D(I.x,0,I.z),puerta:new D(_.x,0,_.z),base:T.scale.x,onFin:g||null}}function Th(){x=!1,o=nc||o,a.add(o),n=Math.max(n,t);let g=r[o]?r[o].parada:e.paradas[t];if(g&&ze(g)){let v=At(o);v>0&&l.add(v)}q(),Ni(),Bi(!1);let _=ma;ma=null,g&&ze(g)?wh(()=>Nh()):g&&g.id!=="inicio"&&g.id!=="fin"?dc(t):g&&g.id==="fin"&&(Ss(g),cn(),Hh()),_&&_()}function rc(g){let _=js(g);return _==="video"?" Veamos el video.":_==="imagen"?" Mira esta imagen.":""}function Ah(g){if(!g)return"";let _=g.titulo||"";switch(g.id){case"modulo":return"\xA1Mira! Nuestro m\xF3dulo es: "+_+"."+rc(g);case"eje":return"Ahora seguimos con el eje: "+_+"."+rc(g);case"tematica":return"La tem\xE1tica de hoy es: "+_+".";case"fin":return"\xA1Lo lograste! Terminamos la aventura. \xA1Muy bien!";default:return ze(g)?"\xA1Llegamos a la experiencia: "+_+"! \xBFLa hacemos juntos?":_}}function Ss(g,_){ce(Ah(g),_)}function js(g){return g?g.tipo_media||(g.imagen_url?"imagen":g.video_url||g.videoUrl?"video":"ninguno"):"ninguno"}function Qs(g){return js(g)==="video"}function er(g){return js(g)==="imagen"}function Rh(g){return Qs(g)||er(g)}function Ch(g){let _=g.media_embed||"directo",v=g.embed_url||g.media_url||g.video_url||g.videoUrl||"";return{embed:_,embedUrl:v}}function _a(g){let _=oe("#rn3dVideoFs"),v=oe("#rn3dMediaFsCerrar"),I=g==="imagen";v.length&&v.prop("hidden",!I).attr("aria-hidden",I?"false":"true"),_.prop("hidden",!1).attr("aria-hidden","false").addClass("rn3d-video-fs--activo"),document.body.classList.add("rn3d-video-reproduciendo")}function ac(){let g=oe("#rn3dVideoFs"),_=oe("#rn3dMediaFsCerrar");_.length&&_.prop("hidden",!0).attr("aria-hidden","true"),g.prop("hidden",!0).attr("aria-hidden","true").removeClass("rn3d-video-fs--activo"),document.body.classList.remove("rn3d-video-reproduciendo")}function oc(){_e&&(_e=!1,window.removeEventListener("message",cc))}function cc(g){if(!Ee)return;let _=Ee.media_embed||"directo";if(_==="youtube"&&String(g.origin||"").includes("youtube.com"))try{let v=JSON.parse(g.data);(v.event==="infoDelivery"&&v.info&&v.info.playerState===0||v.event==="onStateChange"&&v.info===0)&&bs()}catch{}if(_==="vimeo"&&String(g.origin||"").includes("vimeo.com"))try{let v=typeof g.data=="string"?JSON.parse(g.data):g.data;v&&v.event==="finish"&&bs()}catch{}}function Ph(){_e||(_e=!0,window.addEventListener("message",cc))}function Lh(){oe("#rnModalVideo").prop("hidden",!1).attr("aria-hidden","false").html('<div class="rn3d-video-replay"><button type="button" class="rn3d-video-replay__btn" data-accion="rever-video"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Volver a ver</button></div>')}function bs(){let g=oe("#rn3dVideoFs"),_=g.find("video")[0];if(_)try{_.pause()}catch{}g.find("iframe").each(function(){this.src=""}),oe("#rn3dVideoFsInner").empty(),ac(),oc(),Ee&&Lh()}function xa(){Ee=null;let g=oe("#rn3dVideoFs"),_=g.find("video")[0];if(_)try{_.pause()}catch{}g.find("iframe").each(function(){this.src=""}),oe("#rn3dVideoFsInner").empty(),ac(),oc(),oe("#rnModalVideo").prop("hidden",!0).attr("aria-hidden","true").empty()}function lc(g){if(!g||!er(g))return;Ee=g;let _=g.imagen_url||g.media_url;if(!_)return;let v=oe("#rn3dVideoFsInner");v.empty(),oe("#rnModalVideo").prop("hidden",!0).attr("aria-hidden","true").empty();let I=document.createElement("img");I.className="rn3d-media-fs__img",I.src=_,I.alt=g.titulo||"Imagen",v[0].appendChild(I),_a("imagen")}function hc(g){if(!g||!Qs(g))return;Ee=g;let{embed:_,embedUrl:v}=Ch(g);if(!v)return;let I=oe("#rn3dVideoFs"),L=oe("#rn3dVideoFsInner");if(L.empty(),oe("#rnModalVideo").prop("hidden",!0).empty(),_==="youtube"||_==="vimeo"){let ie=g.embed_url||v;ie+=(ie.indexOf("?")>=0?"&":"?")+"autoplay=1&playsinline=1",_==="youtube"&&(ie+="&enablejsapi=1&rel=0"),_==="vimeo"&&(ie+="&autopause=0");let ne=document.createElement("iframe");ne.src=ie,ne.setAttribute("allow","autoplay; fullscreen; encrypted-media; picture-in-picture"),ne.setAttribute("allowfullscreen","true"),ne.setAttribute("title",g.titulo||"Video"),ne.addEventListener("load",function(){try{ne.contentWindow.postMessage(JSON.stringify({event:"listening",id:1}),"*")}catch{}}),L[0].appendChild(ne),Ph(),_a("video");return}let B=document.createElement("video");B.src=v,B.playsInline=!0,B.autoplay=!0,B.setAttribute("playsinline","true"),B.setAttribute("webkit-playsinline","true"),L[0].appendChild(B);let Y=function(){bs()};B.addEventListener("ended",Y,{once:!0}),B.addEventListener("error",Y,{once:!0}),_a("video"),B.play().catch(function(){bs()})}function uc(g){return g.id==="fin"?'<button type="button" class="rn-camino-btn rn-camino-btn--pri" id="rnModalSalirKiosco">Salir</button>':ze(g)?'<button type="button" class="rn-camino-btn rn-camino-btn--sec" data-accion="cerrar-exp">Cerrar</button><button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="iniciar-experiencia">Iniciar experiencia</button>':'<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="cerrar">\xA1Seguir!</button>'}function Ih(g){let _=oe("#rnModalVideo"),v=js(g);if(v==="video"||v==="imagen"){_.prop("hidden",!0).attr("aria-hidden","true").empty();return}_.prop("hidden",!0).attr("aria-hidden","true").empty()}function dc(g){let _=e.paradas[g];if(!_||g>n)return;xa(),d=g,Ee=Rh(_)?_:null,oe("#rnModalEtiqueta").text(_.etiqueta||""),oe("#rnModalTitulo").text(_.titulo||"");let v=We(_.texto||"").replace(/\n\n/g,'</p><p class="rn-camino-modal__texto">');_.icono?oe("#rnModalBody").html('<p class="rn-camino-modal__icono" aria-hidden="true">'+We(_.icono)+'</p><p class="rn-camino-modal__texto">'+v+"</p>"):oe("#rnModalBody").html('<p class="rn-camino-modal__texto">'+v+"</p>"),Ih(_),oe("#rnModalFooter").html(uc(_)),oe("#rnCaminoModal").prop("hidden",!1),Qs(_)?Ss(_,function(){hc(_)}):er(_)?Ss(_,function(){lc(_)}):Ss(_)}function gi(){xa(),oe("#rnCaminoModal").prop("hidden",!0).removeClass("rn3d-modal-exp"),d=null}function Dh(){gi();let g=o?r[o]&&r[o].parada:null,_=g&&ze(g),v=_&&!T.visible&&!x&&!Ie,I=()=>{_&&!x&&!Ms&&O().length===0&&o!==u&&!a.has(u)&&setTimeout(Sh,250)};v?sc(()=>{Ni(),Bi(!1),I()}):I()}function Uh(g){return String(i.urlExperienciaTpl||"").replace("__ID__",String(g))}function Fi(){nt(),window.VistaNino&&typeof window.VistaNino.detener=="function"&&window.VistaNino.detener();let g=i.$player;g&&g.length&&g.prop("hidden",!0).removeClass("rn-player--camino-overlay").attr("aria-hidden","true"),i.$shell&&i.$shell.length&&i.$shell.prop("hidden",!1).attr("aria-hidden","false"),E&&E.domElement&&(E.domElement.hidden=!1),oe("#rnCaminoModalPlayer").prop("hidden",!0),oe("body").removeClass("rn-player-activo"),m=null}function fc(){Fi(),!T.visible||ye[o]?sc(()=>{Ni(),Bi(!1)}):(Ni(),Bi(!1))}function pc(g,_,v){return{bloques:g,mediaBase:_||"",experienciaNombre:v||"Experiencia",estudianteSexo:String(oe("#rnApp").data("estudiante-sexo")||""),alTerminarExperiencia:fc}}function Nh(){gi();let g=e.paradas[t];if(!ze(g)||!(g.experiencia_id||e.experiencia_id))return;d=t,oe("#rnModalEtiqueta").text(g.etiqueta||"Experiencia"),oe("#rnModalTitulo").text(g.titulo||"Experiencia");let v=We(g.texto||"").replace(/\n\n/g,'</p><p class="rn-camino-modal__texto">');oe("#rnModalVideo").prop("hidden",!0).empty(),oe("#rnModalBody").html('<div class="rn3d-exp-fiesta" aria-hidden="true"><span class="rn3d-exp-estrella">\u{1F31F}</span><span class="rn3d-confeti rn3d-confeti--1"></span><span class="rn3d-confeti rn3d-confeti--2"></span><span class="rn3d-confeti rn3d-confeti--3"></span><span class="rn3d-confeti rn3d-confeti--4"></span><span class="rn3d-confeti rn3d-confeti--5"></span><span class="rn3d-confeti rn3d-confeti--6"></span></div><p class="rn-camino-modal__texto">'+v+"</p>"),oe("#rnModalFooter").html(uc(g)),oe("#rnCaminoModal").addClass("rn3d-modal-exp").prop("hidden",!1),Ss(g)}function Oh(){gi();let g=d!==null?d:t,_=e.paradas[g];if(!ze(_))return;let v=_?.experiencia_id||e.experiencia_id;if(!v)return;m&&m.id&&Number(m.id)!==Number(v)&&(m=null);let I=i.$player;if(!I||!I.length){alert("No se encontr\xF3 el reproductor de la experiencia.");return}if(i.$shell&&i.$shell.length&&i.$shell.prop("hidden",!0).attr("aria-hidden","true"),E&&E.domElement&&(E.domElement.hidden=!0),I.prop("hidden",!1).attr("aria-hidden","false").addClass("rn-player--camino-overlay"),oe("body").addClass("rn-player-activo"),m){window.VistaNino&&typeof window.VistaNino.iniciar=="function"&&window.VistaNino.iniciar(pc(m.bloques,m.mediaBase,m.nombre));return}oe.ajax({url:Uh(v),method:"GET",dataType:"json",headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}}).done(function(L){if(!L?.success){alert(L?.message||"No se pudo cargar la experiencia."),Fi();return}let B=L?.data;if(!B?.bloques?.length){alert(L?.message||"La experiencia no tiene bloques activos."),Fi();return}if(m={id:v,bloques:B.bloques,mediaBase:B.media_base||"",nombre:B.experiencia?.nombre||"Experiencia"},window.VistaNino&&typeof window.VistaNino.iniciar=="function"){window.VistaNino.iniciar(pc(m.bloques,m.mediaBase,m.nombre));return}alert("El reproductor no est\xE1 disponible. Recarga la p\xE1gina."),Fi()}).fail(function(L){let B=L?.responseJSON?.message||L?.responseJSON?.mensaje||"No se pudo cargar la experiencia.";alert(B),Fi()})}let ya,mc,gc,_i,t0,On,ws=!1;function Bi(g){if(!ya)return;let _=Math.round(n/(re-1)*100);ya.style.width=_+"%";let v=e.paradas[t];mc.textContent=v?yt(v,t):"Paso "+(t+1),gc.textContent=g?"Caminando\u2026":M?t<re-1?"Toca la siguiente parada que brilla":"\xA1Completaste el recorrido!":"Toca \xA1Iniciar! para empezar la aventura"}function Ts(){_i&&(_i.style.display="none")}function Fh(){let g=t+1;if(!M||x||g>=re){Ts();return}let _=ee[g];if(!_){Ts();return}let v=new D;if(_.medallon.getWorldPosition(v),v.y+=1.4,v.project(C),v.z>1){Ts();return}_i.style.display="block",_i.style.left=(v.x*.5+.5)*window.innerWidth+"px",_i.style.top=(-v.y*.5+.5)*window.innerHeight+"px",_i.textContent=yt(_.parada,g)}function Bh(){if(document.getElementById("rnCaminoModal"))return;let g=document.createElement("div");for(g.innerHTML='<div class="rn-camino-modal" id="rnCaminoModal" hidden role="dialog" aria-modal="true"><div class="rn-camino-modal__backdrop" data-accion="cerrar"></div><div class="rn-camino-modal__panel"><header class="rn-camino-modal__header"><p class="rn-camino-modal__etiqueta" id="rnModalEtiqueta"></p><h2 class="rn-camino-modal__titulo" id="rnModalTitulo"></h2></header><div class="rn-camino-modal__video" id="rnModalVideo" hidden aria-hidden="true"></div><div class="rn-camino-modal__body" id="rnModalBody"></div><footer class="rn-camino-modal__footer" id="rnModalFooter"></footer></div></div><div class="rn-camino-modal rn-camino-modal--player" id="rnCaminoModalPlayer" hidden role="dialog" aria-modal="true"><div class="rn-camino-modal__backdrop"></div></div><div class="rn3d-video-fs" id="rn3dVideoFs" hidden aria-hidden="true"><div class="rn3d-video-fs__inner" id="rn3dVideoFsInner"></div><button type="button" class="rn3d-media-fs__cerrar" id="rn3dMediaFsCerrar" data-accion="cerrar-media-fs" hidden aria-hidden="true"><i class="fa-solid fa-check" aria-hidden="true"></i> Continuar</button></div>';g.firstChild;)i.$paso[0].appendChild(g.firstChild)}function Hh(){if(document.getElementById("rn3dCelebracion"))return;let g=document.createElement("div");g.id="rn3dCelebracion",g.className="rn3d-celebracion";let _="",v=["#ff4d4d","#ffd24d","#4dff88","#4db8ff","#e04dff","#ff8f4d"];for(let I=0;I<60;I++){let L=v[I%v.length],B=Math.random()*100,Y=(Math.random()*2).toFixed(2),ie=(2.5+Math.random()*2).toFixed(2),ne=Math.random()*360|0;_+='<span class="rn3d-confeti-p" style="left:'+B+"%;background:"+L+";animation-delay:"+Y+"s;animation-duration:"+ie+"s;transform:rotate("+ne+'deg)"></span>'}g.innerHTML='<div class="rn3d-celebracion__confeti">'+_+'</div><div class="rn3d-celebracion__msg">\u{1F389} \xA1Lo lograste! \u{1F389}<br><small>Completaste toda la aventura</small></div>',i.$paso[0].appendChild(g),setTimeout(()=>{g.classList.add("rn3d-cel-ocultar")},7500),setTimeout(()=>{g.parentNode&&g.parentNode.removeChild(g)},8200)}function zh(){let g=document.createElement("div");g.className="rn3d-overlay",g.innerHTML='<div class="rn3d-hud"><div class="rn3d-hud__bar"><span class="rn3d-hud__fill" id="rn3dFill"></span></div><div class="rn3d-hud__paso" id="rn3dPaso"></div><div class="rn3d-hud__hint" id="rn3dHint"></div></div><div class="rn3d-bocadillo rn3d-oculto" id="rn3dBocadillo"><div class="rn3d-bocadillo__nube"><p class="rn3d-bocadillo__texto">\xA1Hola! \u{1F44B}<br>Bienvenido a esta aventura. Yo te voy a acompa\xF1ar. \xA1Vamos juntos!</p><span class="rn3d-bocadillo__pico"></span></div></div><button class="rn3d-comenzar" id="rn3dIniciar"><span>\xA1Iniciar!</span><span class="rn3d-flecha">\u25B6</span></button><div class="rn3d-etiqueta" id="rn3dEtiqueta"></div>',i.$paso[0].appendChild(g),ya=g.querySelector("#rn3dFill"),mc=g.querySelector("#rn3dPaso"),gc=g.querySelector("#rn3dHint"),_i=g.querySelector("#rn3dEtiqueta"),On=g.querySelector("#rn3dBocadillo");let _=g.querySelector("#rn3dIniciar"),v="\xA1Hola! Bienvenido a esta aventura. Yo te voy a acompa\xF1ar. \xA1Vamos juntos!",I=!1,L=()=>{I&&(I=!1,ws=!1,On.classList.add("rn3d-oculto"),M=!0,Ni(),setTimeout(()=>ic(1),350))},B=4800;_.addEventListener("click",()=>{_.classList.add("rn3d-oculto"),ws=!0,On.classList.remove("rn3d-oculto"),I=!0;let Y=performance.now();ce(v,()=>{let ne=B-(performance.now()-Y);ne>0?setTimeout(L,ne):L()}),setTimeout(()=>{I&&L()},9e3)})}function Vh(){if(!On)return;if(!ws){On.style.display="none";return}let g=new D;if(T.getWorldPosition(g),g.y+=5.4,g.project(C),g.z>1){On.style.display="none";return}On.style.display="block",On.style.left=(g.x*.5+.5)*window.innerWidth+"px",On.style.top=(-g.y*.5+.5)*window.innerHeight+"px"}function _c(g){let _=Ue?Math.min(.1,(g-Ue)/1e3):.016;if(Ue=g,Xt(_),ys(_),xs(g,_),bh(g),x&&$n){let I=Math.min(1,(g-fa)/pa),L=I<.5?2*I*I:1-Math.pow(-2*I+2,2)/2,B=Oi+(vs-Oi)*L,Y=$n.getPoint(B),ie=$n.getTangent(B).normalize();vs<Oi&&ie.multiplyScalar(-1),T.position.set(Y.x,0,Y.z),T.rotation.y=Math.atan2(ie.x,ie.z);let ne=g/95,de=Math.sin(ne),Ae=Math.abs(Math.sin(ne));if(T.position.y=Ae*.16,H&&(H.rotation.x=de*.95,K.rotation.x=-de*.95),G&&(G.position.z=.05+de*.4,$.position.z=.05-de*.4,G.position.y=.24+Math.max(0,-de)*.18,$.position.y=.24+Math.max(0,de)*.18),b&&(b.rotation.x=-de*.85,R.rotation.x=de*.85,b.rotation.z=.12,R.rotation.z=-.12),P&&(P.rotation.z=de*.06,P.rotation.y=de*.08,P.scale.y=1),N&&(N.rotation.z=-de*.04),T.rotation.z=Math.sin(ne*2)*.02,I>=1)if(T.position.y=0,T.rotation.z=0,H&&(H.rotation.x=0,K.rotation.x=0),b&&(b.rotation.x=0,R.rotation.x=0,b.rotation.z=0,R.rotation.z=0),G&&(G.position.z=.05,$.position.z=.05,G.position.y=.24,$.position.y=.24),P&&(P.rotation.z=0,P.rotation.y=0),N&&(N.rotation.z=0),x=!1,$n=null,Ft){Ft=!1;let me=He;He=null,me&&me()}else Th()}else if(P&&(P.scale.y=1+Math.sin(g/500)*.03),b){let I=Math.sin(g/600)*.1;b.rotation.z=I,R.rotation.z=-I}if(ue)if(ae||ws){let L=.5+Math.abs(Math.sin(g/90))*1.1;ue.scale.set(1.3,L,.5),N&&(N.rotation.z=Math.sin(g/260)*.05)}else ue.scale.set(1.3,.5,.5),N&&(N.rotation.z+=(0-N.rotation.z)*.1);let v=!x&&M?pe():[];if(ee.forEach((I,L)=>{let B=v.indexOf(I.parada.id)>=0,Y=M&&I.parada.id===o&&!x;I.medallon.visible=!Y&&I.parada.id!=="inicio",I.medallon.lookAt(C.position),B?(I.medallon.position.y=I.medallon.userData.baseY+Math.abs(Math.sin(g/300))*.5,I.aro.rotation.z+=.05,I.aro.scale.setScalar(1+Math.sin(g/300)*.14),I.aro.position.y=I.medallon.position.y):I.medallon.position.y+=(I.medallon.userData.baseY-I.medallon.position.y)*.2}),Ke){let I=Ke.userData.baseY;Ke.position.y=I+Math.sin(g/600)*.18;let L=new D;Ke.getWorldPosition(L),Ke.lookAt(C.position.x,L.y,C.position.z)}ec(!1),Fh(),Vh(),E.render(y,C),A=requestAnimationFrame(_c)}function Gh(g){xc(),i=g||{};try{e=JSON.parse(document.getElementById("rn-camino")?.textContent||"{}")}catch{e={paradas:[],puntos:[]}}if(!e.paradas?.length)return!1;re=e.paradas.length,rt=e.ambiente&&e.ambiente.slug?String(e.ambiente.slug):"",t=0,n=0,x=!1,M=!1,m=null,j=null,Ue=0,ws=!1,ke(),o=e.paradas[0]?e.paradas[0].id:null,a=new Set,l=new Set,Ms=!1,J=null,se={},ye={},Ie=!1,he=null,ve=null,De=null,et=null,Ke=null,Ge=null,k=!1,ft=null,Ft=!1,He=null,Ze=null;let _=getComputedStyle(i.$shell[0]).getPropertyValue("--rn-color").trim()||"#0ea5e9";try{Tt=new qe(_)}catch{}i.$shell.addClass("rn-shell--camino rn-shell--3d"),i.$paso.attr("data-paso","camino").empty();let v="ontouchstart"in window||navigator.maxTouchPoints>0,I=window.devicePixelRatio||1;return S=v||I>=2,E=new Vs({antialias:!S,powerPreference:"high-performance",stencil:!1}),E.setPixelRatio(Math.min(I,S?1.5:2)),E.setSize(window.innerWidth,window.innerHeight),E.shadowMap.enabled=!0,E.shadowMap.type=S?na:Yo,E.domElement.className="rn3d-canvas",i.$paso[0].appendChild(E.domElement),y=new qr,C=new rn(50,window.innerWidth/window.innerHeight,.1,400),Ys(),ms(),yh(),la(),Z(),Fe(),gs(),Ht(),En(),Zs(),_s(),Nn(),ha(),xh(),da.set(-54,34,48),ua.set(-43,2,-6),ec(!0),$s=new ta,Ks=new we,W=function(L){vh(L.clientX,L.clientY)},E.domElement.addEventListener("click",W),Bh(),zh(),i.$paso.off("click.rn3d"),i.$paso.on("click.rn3d",'[data-accion="cerrar"]',function(L){L.preventDefault(),gi()}),i.$paso.on("click.rn3d",'[data-accion="cerrar-exp"]',function(L){L.preventDefault(),Dh()}),i.$paso.on("click.rn3d",'[data-accion="rever-video"]',function(L){L.preventDefault(),Ee&&(Qs(Ee)?hc(Ee):er(Ee)&&lc(Ee))}),i.$paso.on("click.rn3d",'[data-accion="cerrar-media-fs"]',function(L){L.preventDefault(),bs()}),i.$paso.on("click.rn3d",'[data-accion="iniciar-experiencia"]',function(L){L.preventDefault(),Oh()}),i.$paso.on("click.rn3d","#rnModalSalirKiosco",function(L){L.preventDefault(),kh()}),window.removeEventListener("resize",va),window.addEventListener("resize",va),Ni(),Bi(!1),A=requestAnimationFrame(_c),!0}function va(){C&&(C.aspect=window.innerWidth/window.innerHeight,C.updateProjectionMatrix(),E.setSize(window.innerWidth,window.innerHeight))}function xc(){if(nt(),xa(),Fi(),gi(),A&&(cancelAnimationFrame(A),A=null),E){E.domElement&&W&&E.domElement.removeEventListener("click",W);try{E.dispose()}catch{}E.domElement&&E.domElement.parentNode&&E.domElement.parentNode.removeChild(E.domElement),E=null}W=null,window.removeEventListener("resize",va),i.$paso&&i.$paso.length&&i.$paso.off("click.rn3d"),y=null,C=null,ee=[],he=null,ve=null,J=null,x=!1,M=!1,m=null,t=0,n=0,d=null}function kh(){gi(),typeof i.onSalir=="function"&&i.onSalir()}function Wh(){fc()}window.KioscoCamino={boot:Gh,destroy:xc,irAFinRecorrido:Wh}})();
/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
//# sourceMappingURL=recorrido-camino-3d.bundle.js.map
