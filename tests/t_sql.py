import subprocess, random
d=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
p=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
inv=[0,4,3,2,1,5,6,7,8,9]
def gen(n11):
    c=0
    for i,ch in enumerate(reversed(n11)): c=d[c][p[(i+1)%8][int(ch)]]
    return n11+str(inv[c])
random.seed(1)
def aad(): return gen(str(random.randint(2,9))+''.join(random.choice('0123456789') for _ in range(10)))
if __name__=='__main__':
    ok=[aad() for _ in range(200)]
    bad=[]
    for a in ok[:100]:
        b=a[:-1]+str((int(a[-1])+1)%10); bad.append(b)
    q=" UNION ALL ".join(f"SELECT '{x}' n, hb_validate_id('aadhaar','{x}') r" for x in ok+bad)
    out=subprocess.check_output(['mysql','-uroot','-S','/tmp/m.sock','hotel_booking','-N','-e',q]).decode().split('\n')
    res={l.split('\t')[0]:l.split('\t')[1] for l in out if l}
    print('valid ok:',sum(res[x]=='OK' for x in ok),'/200  corrupted rejected:',sum(res[x]=='AADHAAR_NUMBER_INVALID' for x in bad),'/100')
