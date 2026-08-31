import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';

export async function getAllEmployees(_req, res, next) {
  try {
    const employees = await prisma.employee.findMany({
      include: { role: true },
      orderBy: { id: 'asc' },
    });

    const result = employees.map((e) => ({
      id: e.id,
      rol_id: e.rolId,
      rol_nombre: e.role.nombre,
      nombre: e.nombre,
      apellido: e.apellido,
      cedula: e.cedula,
      telefono: e.telefono,
      username: e.username,
      is_active: e.isActive,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));

    return res.json({ employees: result });
  } catch (err) {
    return next(err);
  }
}

export async function getRoles(_req, res, next) {
  try {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    return res.json({ roles });
  } catch (err) {
    return next(err);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const { rol_id, nombre, apellido, cedula, telefono, username, password } = req.body;

    if (!rol_id || !nombre || !apellido || !username || !password) {
      return res.status(400).json({ error: 'Rol, nombre, apellido, usuario y contraseña son obligatorios' });
    }

    const existing = await prisma.employee.findFirst({
      where: { username: { equals: username.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(409).json({ error: 'El nombre de usuario ya está registrado' });
    }

    if (cedula && cedula.trim()) {
      const existingCedula = await prisma.employee.findFirst({
        where: { cedula: cedula.trim() },
      });
      if (existingCedula) {
        return res.status(409).json({ error: 'La cédula ya está registrada' });
      }
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    const newEmployee = await prisma.employee.create({
      data: {
        rolId: Number(rol_id),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cedula: cedula?.trim() || null,
        telefono: telefono?.trim() || null,
        username: username.trim(),
        passwordHash,
      },
      include: { role: true },
    });

    return res.status(201).json({
      mensaje: 'Empleado registrado con éxito',
      employee: {
        id: newEmployee.id,
        rol_id: newEmployee.rolId,
        rol_nombre: newEmployee.role.nombre,
        nombre: newEmployee.nombre,
        apellido: newEmployee.apellido,
        cedula: newEmployee.cedula,
        telefono: newEmployee.telefono,
        username: newEmployee.username,
        is_active: newEmployee.isActive,
        created_at: newEmployee.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { rol_id, nombre, apellido, cedula, telefono, username, password } = req.body;

    const current = await prisma.employee.findUnique({ where: { id: Number(id) } });
    if (!current) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    if (username) {
      const existing = await prisma.employee.findFirst({
        where: { username: { equals: username.trim(), mode: 'insensitive' }, id: { not: Number(id) } },
      });
      if (existing) {
        return res.status(409).json({ error: 'El nombre de usuario ya está en uso por otro empleado' });
      }
    }

    if (cedula && cedula.trim()) {
      const existingCedula = await prisma.employee.findFirst({
        where: { cedula: cedula.trim(), id: { not: Number(id) } },
      });
      if (existingCedula) {
        return res.status(409).json({ error: 'La cédula ya está en uso por otro empleado' });
      }
    }

    const data = {};
    if (rol_id) data.rolId = Number(rol_id);
    if (nombre) data.nombre = nombre.trim();
    if (apellido) data.apellido = apellido.trim();
    if (cedula !== undefined) data.cedula = cedula?.trim() || null;
    if (telefono !== undefined) data.telefono = telefono?.trim() || null;
    if (username) data.username = username.trim();
    if (password && password.trim().length > 0) {
      data.passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    }

    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data,
      include: { role: true },
    });

    return res.json({
      mensaje: 'Empleado actualizado con éxito',
      employee: {
        id: updated.id,
        rol_id: updated.rolId,
        rol_nombre: updated.role.nombre,
        nombre: updated.nombre,
        apellido: updated.apellido,
        cedula: updated.cedula,
        telefono: updated.telefono,
        username: updated.username,
        is_active: updated.isActive,
        updated_at: updated.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function toggleEmployeeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const employeeId = Number(id);

    if (req.user && req.user.id === employeeId) {
      return res.status(400).json({ error: 'No puede desactivar su propia cuenta activa.' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    if (employee.isActive && employee.role.nombre === 'ADMIN') {
      const activeAdminCount = await prisma.employee.count({
        where: { role: { nombre: 'ADMIN' }, isActive: true },
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: 'No se puede desactivar el único administrador activo del sistema.' });
      }
    }

    const nextStatus = !employee.isActive;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: nextStatus },
    });

    return res.json({
      mensaje: nextStatus ? 'Empleado reactivado con éxito' : 'Empleado desactivado con éxito (borrado lógico)',
      employee: {
        id: updated.id,
        nombre: updated.nombre,
        apellido: updated.apellido,
        username: updated.username,
        is_active: updated.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
}
