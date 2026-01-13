

#======================= 修改这里 ============================
projectDir='manage'
projectDirArray=("tanya")
remoteDir='/usr/local/nginx/html/'
previewRemoteDir='/usr/local/nginx/html/preview/'
sshUserName='root'
remoteAddr='146.56.238.100'
#ssh_config=${sshUserName}@${remoteAddr}
ssh_config=tanya
#======================= 修改这里 ============================

basepath=$(cd "$(dirname "$0")"; pwd)
if [[ $# -ne 0 ]] ; then
echo "要部署的项目:$1"
projectDir=$1
fi
if test -z $remoteAddr
then
read -p "要部署的ip:" remoteAddr
fi
echo "┌-----------------------------┐"
echo "|----0. tanya-pc--------------|"
echo "└-----------------------------┘"
echo ""
read -p "选择要部署的项目序号:" projectIndex
remoteDir=${remoteDir}${projectDirArray[$projectIndex]}
previewRemoteDir=${previewRemoteDir}${projectDirArray[$projectIndex]}
echo "要部署的项目: ${projectDirArray[$projectIndex]}"


send() {
	ssh ${ssh_config} $1
	return $?
}
dirExsit() {
	if ssh ${ssh_config} test -d $1; then
		return 0
	else
		return 1
	fi
}



preview(){
	if ! test -d ${basepath}/dist/; then
		echo "部署文件不存在"
		return 0;
	fi
	send "rm -rf ${previewRemoteDir}/${projectDir}"
	send "mkdir -p ${previewRemoteDir}/${projectDir}"
	scp -r ${basepath}/dist/* ${ssh_config}:"${previewRemoteDir}/${projectDir}"
	return 0
}

deploy() {
	if dirExsit ${previewRemoteDir}/${projectDir}_old/; then
		send "rm -rf ${previewRemoteDir}/${projectDir}_old"
	fi
	if dirExsit ${previewRemoteDir}/${projectDir}_backup/; then
		send "mv ${previewRemoteDir}/${projectDir}_backup ${previewRemoteDir}/${projectDir}_old"
	fi
	if dirExsit ${remoteDir}/${projectDir}/; then
	    send "mv ${remoteDir}/${projectDir} ${previewRemoteDir}/${projectDir}_backup"
	fi
	send "cp -r ${previewRemoteDir}/${projectDir} ${remoteDir}/${projectDir}"
	return 0
}

rollback(){
	if dirExsit ${previewRemoteDir}/${projectDir}_backup/; then
		send "rm -rf ${remoteDir}/${projectDir}"
		send "mv ${previewRemoteDir}/${projectDir}_backup ${previewRemoteDir}/${projectDir}"
	else
		echo "没有备份 回退失败"
	fi
	return 0
}


echo "┌-----------------------┐"
echo "|----0. preview---------|"
echo "|----1. deploy----------|"
echo "|----2. rollback--------|"
echo "└-----------------------┘"
echo ""
echo "input your operation"
read option

case $option in
0)  preview
	;;
1)
	deploy
    ;;
2)
	rollback
    ;;
esac
