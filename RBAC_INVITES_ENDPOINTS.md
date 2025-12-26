# RBAC & Collaboration Invites API Endpoints

Base URL: `http://localhost:3000/api/v1`

**Note:** All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer <your-access-token>
```

---

## Invite Endpoints

### 1. Send Invite to Workspace

**Endpoint:** `POST /api/v1/workspaces/:workspaceId/invites`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "collaborator@example.com",
    "role": "collaborator"
  }'
```

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "collaborator"
}
```

**Role Options:**
- `"owner"` - Full access (Note: Cannot be assigned via invite, only workspace creator is owner)
- `"collaborator"` - Can view, edit, and invite
- `"viewer"` - Can only view (default if role not specified)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "collaborator@example.com",
    "role": "collaborator",
    "invitedById": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "expiresAt": "2026-01-02T18:00:00.000Z",
    "createdAt": "2025-12-26T18:00:00.000Z",
    "updatedAt": "2025-12-26T18:00:00.000Z"
  },
  "message": "Invite sent successfully"
}
```

**Required Permissions:** `canInvite` (Owner or Collaborator)

---

### 2. Get All Invites for a Workspace

**Endpoint:** `GET /api/v1/workspaces/:workspaceId/invites`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/invites \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "collaborator@example.com",
      "role": "collaborator",
      "invitedById": "123e4567-e89b-12d3-a456-426614174000",
      "status": "pending",
      "expiresAt": "2026-01-02T18:00:00.000Z",
      "createdAt": "2025-12-26T18:00:00.000Z",
      "updatedAt": "2025-12-26T18:00:00.000Z"
    },
    {
      "id": "991e8400-e29b-41d4-a716-446655440001",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "viewer@example.com",
      "role": "viewer",
      "invitedById": "123e4567-e89b-12d3-a456-426614174000",
      "status": "accepted",
      "expiresAt": "2026-01-02T19:00:00.000Z",
      "createdAt": "2025-12-26T19:00:00.000Z",
      "updatedAt": "2025-12-26T19:00:00.000Z"
    }
  ]
}
```

**Required Permissions:** Must be a workspace member

---

### 3. Cancel Invite

**Endpoint:** `DELETE /api/v1/workspaces/:workspaceId/invites/:inviteId`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/invites/990e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invite cancelled successfully"
}
```

**Required Permissions:** Owner or the person who sent the invite

---

### 4. Accept Invite

**Endpoint:** `POST /api/v1/invites/accept`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/invites/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
  }'
```

**Request Body:**
```json
{
  "token": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
}
```

**Note:** The token is sent to the invited user's email (in a real application). For testing, you can get the token from the invite response.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440000",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "456e7890-e12b-34d5-a678-901234567890",
    "role": "collaborator",
    "user": {
      "id": "456e7890-e12b-34d5-a678-901234567890",
      "email": "collaborator@example.com",
      "name": "John Collaborator"
    },
    "createdAt": "2025-12-26T20:00:00.000Z",
    "updatedAt": "2025-12-26T20:00:00.000Z"
  },
  "message": "Invite accepted successfully"
}
```

---

### 5. Decline Invite

**Endpoint:** `POST /api/v1/invites/decline`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/invites/decline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
  }'
```

**Request Body:**
```json
{
  "token": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invite declined successfully"
}
```

---

## Role Management Endpoints

### 1. Get All Workspace Members

**Endpoint:** `GET /api/v1/workspaces/:workspaceId/members`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/members \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "role": "owner",
      "user": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "owner@example.com",
        "name": "Workspace Owner"
      },
      "createdAt": "2025-12-26T18:00:00.000Z",
      "updatedAt": "2025-12-26T18:00:00.000Z"
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440001",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "456e7890-e12b-34d5-a678-901234567890",
      "role": "collaborator",
      "user": {
        "id": "456e7890-e12b-34d5-a678-901234567890",
        "email": "collaborator@example.com",
        "name": "John Collaborator"
      },
      "createdAt": "2025-12-26T20:00:00.000Z",
      "updatedAt": "2025-12-26T20:00:00.000Z"
    },
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440002",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "789e0123-e45b-67d8-a901-234567890123",
      "role": "viewer",
      "user": {
        "id": "789e0123-e45b-67d8-a901-234567890123",
        "email": "viewer@example.com",
        "name": "Jane Viewer"
      },
      "createdAt": "2025-12-26T21:00:00.000Z",
      "updatedAt": "2025-12-26T21:00:00.000Z"
    }
  ]
}
```

**Required Permissions:** Must be a workspace member

---

### 2. Update Member Role

**Endpoint:** `PUT /api/v1/workspaces/:workspaceId/members/:memberId/role`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/members/bb0e8400-e29b-41d4-a716-446655440001/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "role": "viewer"
  }'
```

**Request Body:**
```json
{
  "role": "viewer"
}
```

**Role Options:**
- `"collaborator"` - Can view, edit, and invite
- `"viewer"` - Can only view

**Note:** 
- Cannot change owner role
- Cannot assign owner role via this endpoint
- Only workspace owner can update roles

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440001",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "456e7890-e12b-34d5-a678-901234567890",
    "role": "viewer",
    "user": {
      "id": "456e7890-e12b-34d5-a678-901234567890",
      "email": "collaborator@example.com",
      "name": "John Collaborator"
    },
    "createdAt": "2025-12-26T20:00:00.000Z",
    "updatedAt": "2025-12-26T22:00:00.000Z"
  },
  "message": "Member role updated successfully"
}
```

**Required Permissions:** Owner only

---

### 3. Remove Member from Workspace

**Endpoint:** `DELETE /api/v1/workspaces/:workspaceId/members/:memberId`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/workspaces/550e8400-e29b-41d4-a716-446655440000/members/cc0e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Required Permissions:** Owner only

**Note:** Cannot remove the workspace owner

---

## Role Permissions Reference

### Owner
- ✅ **View** - Can view workspace and projects
- ✅ **Edit** - Can edit workspace and projects
- ✅ **Delete** - Can delete workspace and projects
- ✅ **Invite** - Can invite users to workspace
- ✅ **Manage Roles** - Can update member roles and remove members

### Collaborator
- ✅ **View** - Can view workspace and projects
- ✅ **Edit** - Can edit workspace and projects
- ❌ **Delete** - Cannot delete workspace or projects
- ✅ **Invite** - Can invite users to workspace
- ❌ **Manage Roles** - Cannot update roles or remove members

### Viewer
- ✅ **View** - Can view workspace and projects
- ❌ **Edit** - Cannot edit workspace or projects
- ❌ **Delete** - Cannot delete workspace or projects
- ❌ **Invite** - Cannot invite users
- ❌ **Manage Roles** - Cannot update roles or remove members

---

## Complete Workflow Example

### Step 1: Create a Workspace (as Owner)
```bash
curl -X POST http://localhost:3000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "name": "My Team Workspace",
    "description": "Workspace for team collaboration"
  }'
```

Save the `workspaceId` from the response.

### Step 2: Send Invite to Collaborator
```bash
curl -X POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "email": "collaborator@example.com",
    "role": "collaborator"
  }'
```

Save the `token` from the response (in production, this would be sent via email).

### Step 3: Collaborator Accepts Invite
```bash
curl -X POST http://localhost:3000/api/v1/invites/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLLABORATOR_TOKEN" \
  -d '{
    "token": "INVITE_TOKEN_FROM_STEP_2"
  }'
```

### Step 4: View All Members
```bash
curl -X GET http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members \
  -H "Authorization: Bearer OWNER_TOKEN"
```

### Step 5: Update Collaborator to Viewer
```bash
curl -X PUT http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members/MEMBER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "role": "viewer"
  }'
```

### Step 6: Remove Member (if needed)
```bash
curl -X DELETE http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members/MEMBER_ID \
  -H "Authorization: Bearer OWNER_TOKEN"
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes:

- `200` - Success
- `201` - Created (POST requests)
- `400` - Bad Request (validation errors, invalid role, etc.)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (workspace/member/invite not found)
- `500` - Internal Server Error

### Common Error Scenarios:

**1. Missing Authentication:**
```json
{
  "success": false,
  "error": "User not authenticated"
}
```

**2. Insufficient Permissions:**
```json
{
  "success": false,
  "error": "Access denied. Insufficient permissions."
}
```

**3. User Already a Member:**
```json
{
  "success": false,
  "error": "User is already a member of this workspace"
}
```

**4. Pending Invite Exists:**
```json
{
  "success": false,
  "error": "A pending invite already exists for this user"
}
```

**5. Invalid Invite Token:**
```json
{
  "success": false,
  "error": "Invalid invite token"
}
```

**6. Invite Expired:**
```json
{
  "success": false,
  "error": "Invite has expired"
}
```

**7. Cannot Change Owner Role:**
```json
{
  "success": false,
  "error": "Cannot change the role of the workspace owner"
}
```

**8. Only Owner Can Manage Roles:**
```json
{
  "success": false,
  "error": "Only workspace owners can update member roles"
}
```

---

## Notes

1. **Automatic Owner Membership:**
   - When a workspace is created, the creator is automatically added as a member with OWNER role

2. **Invite Expiration:**
   - Invites expire after 7 days
   - Expired invites cannot be accepted

3. **Role Restrictions:**
   - Only one owner per workspace (the creator)
   - Owner role cannot be changed or removed
   - Owner role cannot be assigned via invite

4. **Email Matching:**
   - When accepting an invite, the user's email must match the invite email
   - This ensures invites are accepted by the correct person

5. **Permission Enforcement:**
   - All workspace and project operations now check member permissions
   - Users can only access workspaces they own or are members of
   - Operations are restricted based on role permissions

6. **Swagger Documentation:**
   - View and test all endpoints at: `http://localhost:3000/api/v1/docs`

