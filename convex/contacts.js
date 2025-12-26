import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. getAllContacts – 1‑to‑1 expense contacts + groups

export const getAllContacts = query({
    handler: async (ctx) => {
        const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

        // Find individual contacts -- Start

        // Using 'by_user_and_groups' get all the 'expenses' for the particular user and 'group' in this case will be undefined
        const expensesYouPaid = await ctx  
            .db.query('expenses')
            .withIndex('by_user_and_group', (q) => {
                q.eq('paidByUserId', currentUser._id).eq('groupId', undefined);
            }).collect();

        // Find all of the expenses which are of the user but user has not paid for them 
        const expensesNotPaidYou = (await ctx.db
            .query('expenses')
            .withIndex('by_group', (q) => {
                q.eq('groupId', undefined);
            }).collect()).filter(e => e.paidByUserId !== currentUser._id && e.splits.some(s => s.userId === currentUser._id));

        const personalExpenses = [...expensesYouPaid, ...expensesNotPaidYou];

        // Extract the userIds of all the users who appear in these expenses and to prevent duplicates use Set
        const contactIds = new Set();
        personalExpenses.forEach(expense => {
            // Add userIds who paid on behalf of current user (1-1 expenses)
            if (expense.paidByUserId !== currentUser._id)
                contactIds.add(expense.paidByUserId);

            // Add userIds who are part of splits in these expenses (1-1 expense anyways)
            expense.splits.forEach(split => {
                if (split.userId !== currentUser._id)
                    contactIds.add(split.userId);
            });
        });

        const contactUsers = await Promise.all(
            [...contactIds].map(async (contactId) => {
                const user = await ctx.db.get('users', contactId);

                return user
                    ? {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        imageUrl: user.imageUrl,
                        type: 'user', // Add a type marker to distinguish from  groups
                    }
                    : null;
            })
        );

        // Find individual contacts -- End


        // Find user groups -- Start

        const userGroups = (await ctx.db.query('groups')
            .collect())
            .filter(groups => groups.members.some(member => member.userId === currentUser._id))
            .map((g) => ({
                _id: g._id,
                name: g.name,
                description: g.description,
                memberCount: g.members.length,
                type: "group",
            }));


        // Find user groups -- End

        // Sort results  alphabetically by name
        contactUsers.sort((a, b) => a?.name.localeCompare(b?.name));
        userGroups.sort((a, b) => a.name.localeCompare(b.name));    

        return {
            users: contactUsers.filter(c => c !== null),
            groups: userGroups,
        };

    }
})

// 2. createGroup – create a new group

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    members: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Use the centralized getCurrentUser instead of duplicating auth logic
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    if (!args.name.trim()) throw new Error("Group name cannot be empty");

    const uniqueMembers = new Set(args.members);
    uniqueMembers.add(currentUser._id); // ensure creator

    // Validate that all member users exist
    for (const id of uniqueMembers) {
      if (!(await ctx.db.get(id)))
        throw new Error(`User with ID ${id} not found`);
    }

    return await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim() ?? "",
      createdBy: currentUser._id,
      members: [...uniqueMembers].map((id) => ({
        userId: id,
        role: id === currentUser._id ? "admin" : "member",
        joinedAt: Date.now(),
      })),
    });
  },
});