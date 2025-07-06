import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillNotesActivities() {
  console.log('🔄 Starting backfill of NOTES_ADDED activities...');

  try {
    // Get all orders that have structured notes (JSON format)
    const ordersWithNotes = await prisma.order.findMany({
      where: {
        AND: [
          { notes: { not: null } },
          { notes: { not: '' } }
        ]
      },
      select: {
        id: true,
        notes: true,
        assignedAgentId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`📊 Found ${ordersWithNotes.length} orders with notes`);

    let processedCount = 0;
    let createdActivities = 0;

    for (const order of ordersWithNotes) {
      try {
        // Try to parse notes as JSON
        let notesArray = [];
        try {
          notesArray = JSON.parse(order.notes!);
          if (!Array.isArray(notesArray)) {
            continue; // Skip if not an array
          }
        } catch (e) {
          // Skip if not valid JSON
          continue;
        }

        // Process each note in the array
        for (const note of notesArray) {
          // Only process notes that have agentId, note content, and timestamp
          // This ensures we only track agent-created notes, not EcoManager or system-generated ones
          if (note.agentId && note.note && note.timestamp && note.agentName) {
            
            // Additional filter: Skip EcoManager-generated notes
            const isEcoManagerNote = note.note.includes('Last confirmation:') ||
                                   note.note.includes('Confirmation échouée') ||
                                   note.note.includes('EcoManager') ||
                                   note.agentName === 'EcoManager' ||
                                   note.agentName === 'System';
            
            if (isEcoManagerNote) {
              continue; // Skip EcoManager/system generated notes
            }

            // Verify the agent exists and is a real agent (not system)
            const agent = await prisma.user.findUnique({
              where: { id: note.agentId },
              select: {
                id: true,
                role: true,
                name: true,
                isActive: true
              }
            });

            // Only process if agent exists and is an actual agent role
            if (!agent || !['AGENT_SUIVI', 'AGENT_CALL_CENTER', 'TEAM_MANAGER', 'COORDINATEUR'].includes(agent.role)) {
              continue;
            }

            // Check if activity already exists for this note
            const existingActivity = await prisma.agentActivity.findFirst({
              where: {
                agentId: note.agentId,
                orderId: order.id,
                activityType: 'NOTES_ADDED',
                description: note.note,
                createdAt: new Date(note.timestamp)
              }
            });

            if (!existingActivity) {
              // Create the missing NOTES_ADDED activity
              await prisma.agentActivity.create({
                data: {
                  agentId: note.agentId,
                  orderId: order.id,
                  activityType: 'NOTES_ADDED',
                  description: note.note,
                  createdAt: new Date(note.timestamp)
                }
              });

              createdActivities++;
              console.log(`✅ Created NOTES_ADDED activity for agent ${agent.name} (${note.agentId}) on order ${order.id}`);
            }
          }
        }

        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`📈 Processed ${processedCount}/${ordersWithNotes.length} orders...`);
        }

      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
      }
    }

    console.log(`🎉 Backfill completed!`);
    console.log(`📊 Processed ${processedCount} orders`);
    console.log(`✨ Created ${createdActivities} new NOTES_ADDED activities`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillNotesActivities();