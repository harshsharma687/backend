import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //cb- callback function
    cb(null, "./public/temp"); // Specify the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original filename
  },
});

export const upload = multer({ 
    storage: storage
 });
  