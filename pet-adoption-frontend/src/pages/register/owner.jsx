import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Grid, Paper, Typography, TextField, Button } from '@mui/material'
import userService from "@/utils/services/userService";

export default function RegisterOwnerPage() {
    const router = useRouter();
    const { registerOwner } = userService();

    const passwordRegex = RegExp('[^ -~]');
    const usernameRegex = RegExp('[^a-zA-Z]');

    const paperStyle = { padding: '30px 20px', width: 300, margin: "20px auto" }
    const headerStyle = { margin: 0 }

    const [profileImage, setProfileImage] = useState(null);
    const [isUploading, setIsUploading] = useState(null);
    const [formError, setFormError] = useState(null);
    const [formSuccess, setFormSuccess] = useState();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleSelectChange = (event, fieldName) => {
        const { value } = event.target;
        setFormData((prevState) => ({ ...prevState, [fieldName]: value }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormError(null);
        setFormSuccess(null);
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    const handleProfileImageUpload = (e) => {
        setProfileImage(e.target.files[0]);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const emptyFields = Object.keys(formData).filter(key => !formData[key]);
        if(usernameRegex.test(formData.firstName) || usernameRegex.test(formData.lastName)){
            setFormError("Name contains special characters!");
            return;
        }
        if(passwordRegex.test(formData.password)){
            setFormError("Password has invalid characters!");
            return;
        }
        if (emptyFields.length > 0) {
            const emptyFieldNames = emptyFields.map(field => {
                switch (field) {
                    case 'firstName': return 'First Name';
                    case 'lastName': return 'Last Name';
                    case 'email': return 'Email';
                    case 'password': return 'Password';
                    case 'confirmPassword': return 'Confirm Password';
                    default: return field;
                }
            });
            alert(`Please fill in the following fields: ${emptyFieldNames.join(', ')}`);
            return;
        }

        if (formData.password != formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            setIsUploading(true);
            await registerOwner(formData, profileImage)
                .then(async (result) => {
                    if (result !== null) {
                        setIsUploading(false);
                        router.push(`/pets`);
                    }
                });
        } catch (error) {
            console.error("Error: ", error);
            alert("An error occured during registration.");
        }
    };


    return (
        <Grid>
            <Paper elevation={20} style={paperStyle}>
                <Grid align='center'>

                    <h2 style={headerStyle}>Register</h2>
                    <Typography variant="caption">Please fill this form to create an account!</Typography>
                </Grid>
                <form onSubmit={handleSubmit}>
                    <TextField fullWidth label='First Name' name="firstName" size="small" margin="dense" value={formData.firstName} onChange={handleChange} />
                    <TextField fullWidth label='Last Name' name="lastName" size="small" margin="dense" value={formData.lastName} onChange={handleChange} />
                    <TextField fullWidth label='Email' name="email" size="small" margin="dense" value={formData.email} onChange={handleChange} />
                    <TextField fullWidth label='Password' name="password" type="password" size="small" margin="dense" value={formData.password} onChange={handleChange} />
                    <TextField fullWidth label='Confirm Password' name="confirmPassword" type="password" size="small" margin="dense" value={formData.confirmPassword} onChange={handleChange} />
                    <TextField
                        type="file"
                        label='Profile Picture'
                        name="profilePicture"
                        size="small" margin="dense"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ accept: "image/png, image/gif, image/jpeg" }}
                        onChange={handleProfileImageUpload} />
                    {isUploading ?
                        <Typography> Creating Account...</Typography>
                        :
                        <Button type='submit' variant='contained' color='primary'>Register</Button>
                    }
                    <Button variant='contained' onClick={() => router.push("/register")}>Back</Button>

                </form>
                {formError && (
                  <Typography color="error">{formError}</Typography>
                )}
                {formSuccess && (
                  <Typography color="success">{formSuccess}</Typography>
                )}         
            </Paper>
        </Grid>
    )
}