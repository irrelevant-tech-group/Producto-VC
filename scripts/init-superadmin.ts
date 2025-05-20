// scripts/init-superadmin.ts
import { clerkClient } from '@clerk/clerk-sdk-node';
import { storage } from '../server/storage';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function initSuperAdmin() {
  // Verificar configuración de Clerk
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('Error: CLERK_SECRET_KEY no está definida');
    process.exit(1);
  }

  try {
    console.log('Iniciando configuración del Super Admin...');
    
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    
    if (!superAdminEmail) {
      throw new Error('SUPERADMIN_EMAIL no está definido en las variables de entorno');
    }
    
    // Verificar si ya existe un usuario con ese email en Clerk
    let clerkUser;
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [superAdminEmail]
      });
      
      clerkUser = users.data.length > 0 ? users.data[0] : null;
    } catch (error) {
      console.error('Error al buscar usuario en Clerk:', error);
      throw new Error('Error de comunicación con Clerk');
    }
    
    // Si no existe en Clerk, crearlo
    if (!clerkUser) {
      console.log(`Creando usuario Super Admin en Clerk: ${superAdminEmail}`);
      
      try {
        // Crear usuario en Clerk
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [superAdminEmail],
          password: null, // Enviar email para establecer contraseña
          firstName: 'Super',
          lastName: 'Admin',
          publicMetadata: {
            role: 'admin'
          }
        });
        
        console.log(`Usuario creado en Clerk con ID: ${clerkUser.id}`);
      } catch (createError) {
        console.error('Error creando usuario en Clerk:', createError);
        throw new Error('No se pudo crear el Super Admin en Clerk');
      }
    }
    
    // Verificar si ya existe en nuestra base de datos
    let localUser = await storage.getUserByEmail(superAdminEmail);
    
    if (!localUser) {
      console.log(`Creando Super Admin en base de datos local: ${superAdminEmail}`);
      
      // Crear usuario en la base de datos local
      localUser = await storage.createUser({
        username: superAdminEmail.split('@')[0],
        email: superAdminEmail,
        password: 'clerk-managed', // No usamos password con Clerk
        name: 'Super Admin',
        position: 'Administrator',
        clerkId: clerkUser.id,
        role: 'admin'
      });
      
      console.log(`Super Admin creado en base de datos local con ID: ${localUser.id}`);
    } else {
      console.log(`Super Admin ya existe en base de datos local con ID: ${localUser.id}`);
      
      // Actualizar clerkId si es necesario
      if (!localUser.clerkId) {
        await storage.updateUser(localUser.id, { 
          clerkId: clerkUser.id,
          role: 'admin'
        });
        console.log('Actualizado Super Admin con Clerk ID');
      }
    }
    
    // Crear organización por defecto si no existe
    let defaultOrg;
    try {
      const organizations = await clerkClient.organizations.getOrganizationList();
      defaultOrg = organizations.data.find(org => org.name === 'H20 Capital');
      
      if (!defaultOrg) {
        console.log('Creando organización por defecto en Clerk...');
        defaultOrg = await clerkClient.organizations.createOrganization({
          name: 'H20 Capital',
          slug: 'h20-capital',
          createdBy: clerkUser.id
        });
        console.log(`Organización creada en Clerk con ID: ${defaultOrg.id}`);
      }
      
      // Verificar si el superadmin es miembro de la organización
      const memberships = await clerkClient.organizationMemberships.getOrganizationMembershipList({
        organizationId: defaultOrg.id
      });
      
      const isMember = memberships.data.some(m => m.publicUserData.userId === clerkUser.id);
      
      if (!isMember) {
        console.log('Añadiendo Super Admin a la organización...');
        await clerkClient.organizationMemberships.createOrganizationMembership({
          organizationId: defaultOrg.id,
          userId: clerkUser.id,
          role: 'admin'
        });
        console.log('Super Admin añadido a la organización como admin');
      }
    } catch (orgError) {
      console.error('Error configurando organización:', orgError);
    }
    
    // Crear fondo en la base de datos local si no existe
    if (defaultOrg) {
      let fund = await storage.getFundByClerkOrgId(defaultOrg.id);
      
      if (!fund) {
        console.log('Creando fondo por defecto en base de datos local...');
        fund = await storage.createFund({
          id: uuidv4(),
          name: defaultOrg.name,
          slug: defaultOrg.slug,
          clerkOrgId: defaultOrg.id,
          logoUrl: '/logo.svg', // Logo por defecto
          description: 'Fondo de inversión principal',
          createdBy: localUser.id
        });
        
        console.log(`Fondo creado con ID: ${fund.id}`);
        
        // Asignar el fondo al superadmin
        await storage.updateUser(localUser.id, { fundId: fund.id });
        console.log(`Asignado fondo ${fund.id} al Super Admin`);
      }
    }
    
    console.log('Configuración del Super Admin completada con éxito!');
  } catch (error) {
    console.error('Error en la configuración del Super Admin:', error);
    process.exit(1);
  }
}

initSuperAdmin()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script:', err);
    process.exit(1);
  });