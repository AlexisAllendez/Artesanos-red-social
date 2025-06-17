const { body } = require('express-validator');

const registerValidation = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('apellido')
        .trim()
        .notEmpty().withMessage('El apellido es requerido')
        .isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('El email debe tener un formato válido'),
    body('password')
        .trim()
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),
    body('artType')
        .trim()
        .notEmpty().withMessage('El tipo de artesanía es requerido')
        .isLength({ min: 2 }).withMessage('El tipo de artesanía debe tener al menos 2 caracteres'),
    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La descripción no puede exceder los 500 caracteres'),
    body('intereses')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Los intereses no pueden exceder los 200 caracteres'),
    body('antecedentes')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Los antecedentes no pueden exceder los 500 caracteres')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('El email debe tener un formato válido'),
    body('password')
        .trim()
        .notEmpty().withMessage('La contraseña es requerida')
];

module.exports = {
    registerValidation,
    loginValidation
}; 