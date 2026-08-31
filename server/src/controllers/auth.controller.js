import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const employee = await prisma.employee.findFirst({
      where: { username: { equals: username.trim(), mode: 'insensitive' } },
      include: { role: true },
    });

    if (!employee) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!employee.isActive) {
      return res.status(403).json({ error: 'El usuario se encuentra desactivado. Consulte con el Administrador.' });
    }

    const validPassword = await bcrypt.compare(password, employee.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const userPayload = {
      id: employee.id,
      username: employee.username,
      role: employee.role.nombre,
      nombre: employee.nombre,
      apellido: employee.apellido,
      cedula: employee.cedula,
      telefono: employee.telefono,
    };

    const token = jwt.sign(userPayload, config.jwt.secret, { expiresIn: config.jwt.ttl });

    return res.json({ token, user: userPayload });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!employee || !employee.isActive) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    return res.json({
      user: {
        id: employee.id,
        username: employee.username,
        role: employee.role.nombre,
        nombre: employee.nombre,
        apellido: employee.apellido,
        cedula: employee.cedula,
        telefono: employee.telefono,
      },
    });
  } catch (err) {
    return next(err);
  }
}
