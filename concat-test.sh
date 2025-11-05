#!/bin/bash

# Define the base URL
BASE_URL='http://localhost:3000/_/renders/1fab551a-261b-4617-b285-8fe18409e166/segment/'

# Define the session cookie
COOKIE='_session=eyJ0eXBlIjoiZW1haWxfcGFzc3dvcmRzIiwidWlkIjoiMzc3OGYwMmItYTVlZC00ZjNmLTljMDYtNzg2MWM5YTBjNzlkIiwiY2lkIjoiMjUwMjRjOGMtMDZiNS00ZDViLWI5OGUtNjQxMmNlYzE5NmUzIiwiZW1haWwiOiJjb2xsaW5AZWRpdGZyYW1lLmNvbSJ9.uipFodZB%2FsT2%2BHn2rJn6sfBuvbx6Jesp7ZLYATB6nMM'

# Array to store downloaded segment files
downloaded_files=()

# Get the highest segment number from command-line argument
highest_segment="$1"

SEGMENT_IDS=(init)

# Loop through each segment ID and make the request
for ((segment_id = 0; segment_id <= highest_segment; segment_id++))
do
  SEGMENT_IDS+=($segment_id)
done

# Loop through each segment ID and make the request
for segment_id in "${SEGMENT_IDS[@]}"
do
    # Construct the URL for the current segment ID
    URL="${BASE_URL}${segment_id}.m4s"

    echo "Downloading segment $segment_id"

    # Make the request using curl and save the response to a file
    curl -H "Cookie: $COOKIE" "$URL" > "${segment_id}.m4s"

    # Print a message indicating the request status
    echo "Segment $segment_id downloaded"

    # Add the downloaded file to the array
    downloaded_files+=("${segment_id}.m4s")
done

# Concatenate all downloaded files into a single file named concat.mp4
cat "${downloaded_files[@]}" > concat.mp4
rm "${downloaded_files[@]}"

echo "All segments downloaded and concatenated successfully"