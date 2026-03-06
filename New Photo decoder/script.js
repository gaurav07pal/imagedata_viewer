// script.js
const fileInput = document.getElementById('file-input');
const uploadBox = document.getElementById('upload-box');
const resultsSection = document.getElementById('results-section');
const imagePreview = document.getElementById('image-preview');
const errorMsg = document.getElementById('error-msg');
const mapsBtn = document.getElementById('maps-btn');
const rawDataBox = document.getElementById('raw-data');
const heicWarning = document.getElementById('heic-warning');

uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset UI
    resultsSection.style.display = 'none';
    errorMsg.style.display = 'none';
    mapsBtn.style.display = 'none';
    rawDataBox.innerHTML = '';
    heicWarning.style.display = 'none';

    // Handle Image Preview
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (isHeic) {
        imagePreview.style.display = 'none';
        heicWarning.style.display = 'block';
    } else {
        imagePreview.style.display = 'block';
        imagePreview.src = URL.createObjectURL(file);
    }

    try {
        // Extract data
        const exifData = await exifr.parse(file);
        
        // --- NEW: PLATFORM DETECTIVE LOGIC ---
        if (!exifData) {
            let guess = "It may have been stripped by a social media app.";
            const fileName = file.name.toUpperCase();

            // Forensic guessing based on filename patterns
            if (fileName.includes('-WA') || fileName.includes('WHATSAPP')) {
                guess = "Looks like this image was sent via WhatsApp. WhatsApp automatically deletes all location and camera data for privacy.";
            } else if (fileName.includes('SNAPCHAT')) {
                guess = "Looks like this is from Snapchat. Snapchat deletes hidden metadata.";
            } else if (fileName.includes('FB') || fileName.includes('_N.JPG') || fileName.includes('_N.JPEG')) {
                guess = "Looks like this was downloaded from Facebook. Facebook strips EXIF data to protect user privacy.";
            } else if (fileName.includes('IG') || fileName.includes('INSTAGRAM')) {
                guess = "Looks like this is from Instagram. Instagram removes original metadata during upload.";
            } else if (fileName.includes('SIGNAL')) {
                guess = "Looks like this is from Signal. Signal is highly secure and scrubs all metadata.";
            }

            errorMsg.innerText = `No EXIF data found. \n\nDetective Analysis: ${guess}`;
            errorMsg.style.display = 'block';
            return; // Stop running the rest of the code
        }
        // --- END OF DETECTIVE LOGIC ---

        // 1. Core Data
        const make = exifData.Make || '';
        const model = exifData.Model || '';
        document.getElementById('data-camera').innerText = make || model ? `${make} ${model}` : 'Unknown Camera';
        
        const dateTaken = exifData.DateTimeOriginal;
        document.getElementById('data-date').innerText = dateTaken ? new Date(dateTaken).toLocaleString() : 'Unknown Date';

        // 2. GPS & Maps
        if (exifData.latitude && exifData.longitude) {
            const lat = exifData.latitude.toFixed(6);
            const lng = exifData.longitude.toFixed(6);
            document.getElementById('data-gps').innerHTML = `${lat}, ${lng}`;
            mapsBtn.style.display = 'block';
            mapsBtn.onclick = () => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else {
            document.getElementById('data-gps').innerText = 'No GPS Data Found';
        }

        // 3. HUMAN-FRIENDLY TRANSLATOR FOR EXTRA DETAILS
        let extraHTML = '';
        const friendlyNames = {
            FNumber: "Aperture (F-Stop)",
            ExposureTime: "Shutter Speed",
            ISO: "Light Sensitivity (ISO)",
            FocalLength: "Focal Length",
            Flash: "Flash Used",
            Orientation: "Image Orientation",
            Software: "Editing Software",
            LensModel: "Lens Type",
            WhiteBalance: "White Balance"
        };

        const width = exifData.ImageWidth || exifData.ExifImageWidth;
        const height = exifData.ImageHeight || exifData.ImageLength || exifData.ExifImageHeight;
        if (width && height) {
            extraHTML += `<div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
                            <strong style="color: #d4af37;">Resolution:</strong> 
                            <span style="float: right; color: #f5f5f7;">${width} x ${height} pixels</span>
                          </div>`;
        }

        for (let key in friendlyNames) {
            if (exifData[key] !== undefined) {
                let value = exifData[key];
                
                if (key === 'ExposureTime' && typeof value === 'number' && value < 1) {
                    value = `1/${Math.round(1/value)} seconds`;
                } else if (key === 'FocalLength') {
                    value = `${value} mm`;
                } else if (key === 'FNumber') {
                    value = `f/${value}`;
                }

                extraHTML += `<div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
                                <strong style="color: #d4af37;">${friendlyNames[key]}:</strong> 
                                <span style="float: right; color: #f5f5f7;">${value}</span>
                              </div>`;
            }
        }
        
        rawDataBox.innerHTML = extraHTML || '<p style="color: #f5f5f7;">No extra camera settings found.</p>';
        resultsSection.style.display = 'block';

    } catch (error) {
        console.error("Error reading EXIF:", error);
        errorMsg.innerText = "Error reading metadata.";
        errorMsg.style.display = 'block';
    }
});