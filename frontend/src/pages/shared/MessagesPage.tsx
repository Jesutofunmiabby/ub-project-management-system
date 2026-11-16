import React, { useState } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Badge,
  InputAdornment,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { messagesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Contact, Message } from '../../types';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await messagesAPI.getContacts();
      return response.data.data;
    },
  });

  const { data: conversation, refetch: refetchConversation } = useQuery<Message[]>({
    queryKey: ['conversation', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];
      const response = await messagesAPI.getConversation(selectedContact.id);
      return response.data.data;
    },
    enabled: !!selectedContact,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedContact) throw new Error('No contact selected');
      return messagesAPI.send(selectedContact.id, content);
    },
    onSuccess: () => {
      setNewMessage('');
      refetchConversation();
      queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to send message', {
        variant: 'error',
      });
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  const filteredContacts = contacts?.filter(
    (c) =>
      c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Messages
      </Typography>

      <Grid container spacing={3}>
        {/* Contacts List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'calc(100vh - 200px)' }}>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>
            <Divider />
            <List sx={{ overflow: 'auto', height: 'calc(100% - 72px)' }}>
              {filteredContacts && filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <ListItemButton
                    key={contact.id}
                    selected={selectedContact?.id === contact.id}
                    onClick={() => setSelectedContact(contact)}
                    sx={{
                      py: 2,
                      '&.Mui-selected': {
                        backgroundColor: alpha('#3b82f6', 0.15),
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        }}
                      >
                        {contact.first_name[0]}
                        {contact.last_name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${contact.first_name} ${contact.last_name}`}
                      secondary={contact.relationship}
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ textTransform: 'capitalize' }}
                    />
                  </ListItemButton>
                ))
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No contacts found</Typography>
                </Box>
              )}
            </List>
          </Card>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            {selectedContact ? (
              <>
                {/* Header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: `1px solid ${alpha('#ffffff', 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    }}
                  >
                    {selectedContact.first_name[0]}
                    {selectedContact.last_name[0]}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {selectedContact.first_name} {selectedContact.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedContact.email}
                    </Typography>
                  </Box>
                </Box>

                {/* Messages */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {conversation && conversation.length > 0 ? (
                    conversation.map((message) => {
                      const isSent = message.sender_id === user?.id;
                      return (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            justifyContent: isSent ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '70%',
                              p: 2,
                              borderRadius: 2,
                              background: isSent
                                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                                : alpha('#ffffff', 0.05),
                            }}
                          >
                            <Typography>{message.content}</Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: 0.7,
                                textAlign: isSent ? 'right' : 'left',
                              }}
                            >
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography color="text.secondary">
                        No messages yet. Start a conversation!
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Input */}
                <Box
                  sx={{
                    p: 2,
                    borderTop: `1px solid ${alpha('#ffffff', 0.1)}`,
                    display: 'flex',
                    gap: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    sx={{
                      minWidth: 'auto',
                      px: 3,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    }}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">
                  Select a contact to start messaging
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagesPage;

