#script
file="app.zip"

if [ -f "$file" ]
then
	rm "$file"
fi

zip "$file" ./*
if [ -f "$file" ]
then
	echo "build complete"
else
	echo "cannot create zip file"
fi
