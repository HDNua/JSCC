#script
file="app.zip"

if [ -f "$file" ]
then
	node main.js
else
	echo "cannot find $file"
fi
