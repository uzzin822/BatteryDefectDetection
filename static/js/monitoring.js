document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureButton = document.getElementById('capture');
    const ctx = canvas.getContext('2d');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play();
        })
        .catch(err => {
            console.error("Error accessing the camera", err);
        });

    captureButton.addEventListener('click', function() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('image', blob, 'captured_image.jpg');

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Image uploaded successfully:', data);
            })
            .catch(error => {
                console.error('Error uploading image:', error);
            });
        }, 'image/jpeg');
    });

    function updateImage() {
        fetch('/api/get-latest-image')
            .then(response => response.json())
            .then(data => {
                if (data.image_path) {
                    document.getElementById("camera1").src = data.image_path + "?t=" + new Date().getTime();
                }
            })
            .catch(error => console.error("Error fetching latest image:", error));
    }

    setInterval(updateImage, 1000);
    updateImage();
});