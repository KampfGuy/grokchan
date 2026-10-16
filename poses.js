// Shared pose definitions for avatar.js and pose.html.
// Values are Euler angles in radians (order XYZ) applied to VRM *normalized* humanoid bones.
// Keys are either short aliases (below), "l"/"r" + finger bone (e.g. lIndexProximal), or full VRM bone names.
export const SHORT={lua:"leftUpperArm",rua:"rightUpperArm",lla:"leftLowerArm",rla:"rightLowerArm",lh:"leftHand",rh:"rightHand",sp:"spine",ch:"chest",nk:"neck",hd:"head"};
export const boneName=k=>SHORT[k]||(/^[lr][A-Z]/.test(k)?(k[0]==="l"?"left":"right")+k.slice(1):k);
const FN=["Index","Middle","Ring","Little"],FS=["Proximal","Intermediate","Distal"];
const M=v=>[v[0],-v[1],-v[2]]; // mirror left -> right
const HIPL={lua:[0,0.3,-0.85],lla:[0,-0.5,-1.6],lh:[0,0.1,0.3]};
const HIPS={lua:HIPL.lua,rua:M(HIPL.lua),lla:HIPL.lla,rla:M(HIPL.lla),lh:HIPL.lh,rh:M(HIPL.lh),sp:[0,0,0],ch:[-0.03,0,0],nk:[0,0,0],hd:[-0.05,0,0.05]};
// resting pose: left hand on hip, right arm hanging down; head tilt
const REST={lua:HIPL.lua,lla:HIPL.lla,lh:HIPL.lh,rua:[0.05,0,1.2],rla:[0,0.05,0],rh:[0,0,0.05],sp:[0,0.05,0.05],ch:[0,0.04,0.04],nk:[0,0,0.05],hd:[0,0.1,0.12]};
for(const f of FN)for(const j of FS){REST["l"+f+j]=[0,0,-0.25];REST["r"+f+j]=[0,0,0.15]}
const CHIN={lua:HIPL.lua,lla:HIPL.lla,lh:HIPL.lh,rua:[-0.4,0.65,1.0],rla:[0,2.25,-0.3],rh:[0.5,0,0.3],sp:[0,0,0],ch:[0,0,0],nk:[0,0,0],hd:[0.05,0,-0.1]};
for(const f of["Ring","Little"])for(const j of FS)CHIN["r"+f+j]=[0,0,1.3];
for(const f of["Index","Middle"])CHIN["r"+f+"Proximal"]=[0,0,0.15];
for(const sd of["l","r"])for(const f of FN)for(const j of FS){HIPS[sd+f+j]=[0,0,(sd==="l"?-1:1)*0.25];if(sd==="l")CHIN[sd+f+j]=[0,0,-0.25]}
// BEGIN CUSTOM POSES (managed by apply_pose.py; one JSON value per line)
export const CUSTOM={};
export const ROLE={"idle":"REST","talkA":"HIPS","talkB":"CHIN"};
// END CUSTOM POSES
export const POSES={REST,HIPS,CHIN,...CUSTOM};
